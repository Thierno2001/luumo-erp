# -*- coding: utf-8 -*-
"""
Contrôleur Flotte & Livraisons
(`GET /fleet/vehicles`, `POST /fleet/vehicles/create`, `POST /fleet/vehicles/<id>/toggle-status`, `POST /fleet/vehicles/<id>/repair`)
"""
import json
from odoo import fields
from odoo.exceptions import ValidationError
from odoo.http import request

from ..services.accounting_service import ensure_company_infrastructure
from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_vehicle


class LuumoFleetController(LuumoBaseController):

    @luumo_route('/fleet/vehicles', ['GET'])
    def fleet_vehicles(self):
        def _do():
            env = request.env
            ensure_company_infrastructure(env, env.company)
            vehicles = env['fleet.vehicle'].sudo().search([
                ('company_id', '=', env.company.id)
            ], limit=100, order='license_plate, id desc')
            return self._ok([serialize_vehicle(v) for v in vehicles])
        return self._guard(_do, app_id='fleet')

    @luumo_route('/fleet/vehicles/create', ['POST'])
    def create_vehicle(self):
        def _do():
            env = request.env
            ensure_company_infrastructure(env, env.company)
            p = self._payload()
            name = clean_text(p.get('name'), 'Modèle / Désignation du véhicule', min_len=2, max_len=100, required=True)
            plate = clean_text(p.get('license_plate'), 'Plaque d’immatriculation', min_len=2, max_len=32, required=True).upper()
            driver_name = clean_text(p.get('driver') or '', 'Chauffeur', max_len=100)
            route = clean_text(p.get('route') or 'Conakry', 'Axe / Zone de livraison', max_len=100)
            vtype = clean_text(p.get('vehicle_type') or 'Camion', 'Type d’engin', max_len=50)
            fuel_budget = max(0.0, float(p.get('monthly_fuel') or 0.0))
            init_odometer = max(0.0, float(p.get('initial_odometer') or 0.0))

            # Unicité de la plaque par société (évite les doublons)
            existing = env['fleet.vehicle'].sudo().search([
                ('license_plate', '=ilike', plate),
                ('company_id', '=', env.company.id)
            ], limit=1)
            if existing:
                raise ValidationError(f"Un véhicule avec la plaque « {plate} » existe déjà dans votre flotte.")

            Brand = env['fleet.vehicle.model.brand'].sudo()
            brand = Brand.search([('name', '=ilike', 'Luumo Fleet')], limit=1)
            if not brand:
                brand = Brand.create({'name': 'Luumo Fleet'})

            Model = env['fleet.vehicle.model'].sudo()
            vmodel = Model.search([('name', '=ilike', name)], limit=1)
            if not vmodel:
                vmodel = Model.create({'name': name, 'brand_id': brand.id})

            driver_id = False
            if driver_name and driver_name.lower() != 'non assigné':
                Partner = env['res.partner'].sudo()
                driver = Partner.search([
                    ('name', '=ilike', driver_name),
                    ('company_id', '=', env.company.id)
                ], limit=1)
                if not driver:
                    driver = Partner.create({
                        'name': driver_name,
                        'company_id': env.company.id,
                    })
                driver_id = driver.id

            State = env['fleet.vehicle.state'].sudo()
            op_state = State.search([('name', '=ilike', 'Opérationnel')], limit=1)
            if not op_state:
                op_state = State.create({'name': 'Opérationnel', 'sequence': 1})

            meta = {
                'monthly_fuel': fuel_budget,
                'vehicle_type': vtype,
                'route': route,
            }

            vehicle = env['fleet.vehicle'].sudo().create({
                'model_id': vmodel.id,
                'license_plate': plate,
                'driver_id': driver_id,
                'company_id': env.company.id,
                'location': route,
                'state_id': op_state.id,
                'description': f"<p>Luumo Meta: {json.dumps(meta)}</p>",
            })

            if init_odometer > 0:
                env['fleet.vehicle.odometer'].sudo().create({
                    'vehicle_id': vehicle.id,
                    'value': init_odometer,
                    'date': fields.Date.context_today(env.user),
                })

            return self._ok(serialize_vehicle(vehicle), status=201)
        return self._guard(_do, app_id='fleet')

    @luumo_route('/fleet/vehicles/<int:vehicle_id>/toggle-status', ['POST'])
    def toggle_vehicle_status(self, vehicle_id):
        """Bascule rapide en 1 clic : 'Opérationnel' <-> 'Au garage'."""
        def _do():
            env = request.env
            ensure_company_infrastructure(env, env.company)
            vehicle = env['fleet.vehicle'].sudo().search([
                ('id', '=', vehicle_id),
                ('company_id', '=', env.company.id)
            ], limit=1)
            if not vehicle:
                return self._error("Véhicule introuvable dans votre flotte.", 404)

            State = env['fleet.vehicle.state'].sudo()
            op_state = State.search([('name', '=ilike', 'Opérationnel')], limit=1)
            garage_state = State.search([('name', '=ilike', 'Au garage')], limit=1)
            if not op_state:
                op_state = State.create({'name': 'Opérationnel', 'sequence': 1})
            if not garage_state:
                garage_state = State.create({'name': 'Au garage', 'sequence': 2})

            current_name = (vehicle.state_id.name or '').lower() if vehicle.state_id else ''
            is_in_garage = 'garage' in current_name or 'entretien' in current_name
            new_state = op_state if is_in_garage else garage_state

            vehicle.write({'state_id': new_state.id})
            return self._ok(serialize_vehicle(vehicle))
        return self._guard(_do, app_id='fleet')

    @luumo_route('/fleet/vehicles/<int:vehicle_id>/repair', ['POST'])
    def record_repair(self, vehicle_id):
        """Enregistre une réparation / maintenance au garage :
        1. Consigne l'intervention dans `fleet.vehicle.log.services`.
        2. Met à jour le kilométrage compteur si fourni (`fleet.vehicle.odometer`).
        3. Crée la sortie de caisse comptable dans `hr.expense` si demandé (Espèces).
        4. Remet le véhicule en statut 'Opérationnel' (sortie d'atelier).
        """
        def _do():
            env = request.env
            ensure_company_infrastructure(env, env.company)
            vehicle = env['fleet.vehicle'].sudo().search([
                ('id', '=', vehicle_id),
                ('company_id', '=', env.company.id)
            ], limit=1)
            if not vehicle:
                return self._error("Véhicule introuvable dans votre flotte.", 404)

            p = self._payload()
            reason = clean_text(p.get('reason'), "Motif de l'intervention mécanique", min_len=2, max_len=120, required=True)
            garage_name = clean_text(p.get('garage') or 'Garage & Entretien Auto', "Garage / Prestataire", max_len=100)
            amount = float(p.get('amount') or 0.0)
            if amount <= 0:
                raise ValidationError("Le montant de la réparation doit être supérieur à 0 GNF.")

            odometer = float(p.get('odometer') or 0.0)
            from_cash = bool(p.get('from_cash', True))

            # 1. Créer le journal de service flotte
            ServType = env['fleet.service.type'].sudo()
            st = ServType.search([('category', '=', 'service')], limit=1)

            Partner = env['res.partner'].sudo()
            vendor = Partner.search([
                ('name', '=ilike', garage_name),
                ('company_id', '=', env.company.id)
            ], limit=1)
            if not vendor:
                vendor = Partner.create({
                    'name': garage_name,
                    'company_id': env.company.id,
                    'supplier_rank': 1,
                })

            service = env['fleet.vehicle.log.services'].sudo().create({
                'vehicle_id': vehicle.id,
                'service_type_id': st.id,
                'description': f"{reason} — {vehicle.license_plate}",
                'amount': amount,
                'vendor_id': vendor.id,
                'date': fields.Date.context_today(env.user),
                'state': 'done',
            })

            # 2. Relevé de compteur kilométrique
            if odometer > 0:
                env['fleet.vehicle.odometer'].sudo().create({
                    'vehicle_id': vehicle.id,
                    'value': odometer,
                    'date': fields.Date.context_today(env.user),
                })

            # 3. Sortie de caisse / Note de frais liée
            if from_cash:
                Product = env['product.product'].sudo()
                exp_product = Product.search([
                    ('can_be_expensed', '=', True),
                    '|', ('company_id', '=', False), ('company_id', '=', env.company.id)
                ], limit=1)

                driver_partner = vehicle.driver_id
                emp_name = driver_partner.name if driver_partner else "Chauffeur Flotte"
                Employee = env['hr.employee'].sudo()
                emp = Employee.search([
                    ('name', '=ilike', emp_name),
                    ('company_id', '=', env.company.id)
                ], limit=1)
                if not emp:
                    emp = Employee.create({
                        'name': emp_name,
                        'company_id': env.company.id,
                    })

                env['hr.expense'].sudo().create({
                    'name': f"Entretien {vehicle.license_plate} : {reason}",
                    'employee_id': emp.id,
                    'product_id': exp_product.id,
                    'total_amount_currency': amount,
                    'date': fields.Date.context_today(env.user),
                    'company_id': env.company.id,
                    'payment_mode': 'company_account',
                })

            # 4. Remettre automatiquement le véhicule en service actif (sortie de garage)
            State = env['fleet.vehicle.state'].sudo()
            op_state = State.search([('name', '=ilike', 'Opérationnel')], limit=1)
            if op_state:
                vehicle.write({'state_id': op_state.id})

            return self._ok({
                'vehicle': serialize_vehicle(vehicle),
                'service_id': service.id,
            })
        return self._guard(_do, app_id='fleet')

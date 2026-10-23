# -*- coding: utf-8 -*-
"""
Contrôleur Flotte & Livraisons (`/fleet/vehicles`, `/fleet/vehicles/create`)
"""
from odoo.http import request

from ..services.http_core import LuumoBaseController, luumo_route
from ..services.security_owasp import clean_text
from ..services.serializers import serialize_vehicle


class LuumoFleetController(LuumoBaseController):

    @luumo_route('/fleet/vehicles', ['GET'])
    def fleet_vehicles(self):
        def _do():
            vehicles = request.env['fleet.vehicle'].search([], limit=50)
            return self._ok([serialize_vehicle(v) for v in vehicles])
        return self._guard(_do)

    @luumo_route('/fleet/vehicles/create', ['POST'])
    def create_vehicle(self):
        def _do():
            p = self._payload()
            name = clean_text(p.get('name'), 'Modèle / Désignation du véhicule', min_len=2, max_len=100, required=True)
            plate = clean_text(p.get('license_plate'), 'Plaque d’immatriculation', min_len=2, max_len=32, required=True)
            driver_name = clean_text(p.get('driver') or '', 'Chauffeur', max_len=100)

            Brand = request.env['fleet.vehicle.model.brand']
            brand = Brand.search([('name', '=ilike', 'Luumo Fleet')], limit=1)
            if not brand:
                brand = Brand.create({'name': 'Luumo Fleet'})

            Model = request.env['fleet.vehicle.model']
            vmodel = Model.search([('name', '=ilike', name)], limit=1)
            if not vmodel:
                vmodel = Model.create({'name': name, 'brand_id': brand.id})

            driver_id = False
            if driver_name:
                Partner = request.env['res.partner']
                driver = Partner.search([('name', '=ilike', driver_name)], limit=1)
                if not driver:
                    driver = Partner.create({
                        'name': driver_name,
                        'company_id': request.env.company.id,
                    })
                driver_id = driver.id

            vehicle = request.env['fleet.vehicle'].create({
                'model_id': vmodel.id,
                'license_plate': plate,
                'driver_id': driver_id,
                'company_id': request.env.company.id,
            })
            return self._ok(serialize_vehicle(vehicle), status=201)
        return self._guard(_do)

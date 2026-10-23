# -*- coding: utf-8 -*-
"""
Point d'entrée fédérateur de Luumo REST API (`controllers/main.py`)
===================================================================
L'architecture est découpée par domaine métier pour garantir la maintenabilité :
- `services/http_core.py`         : Socle HTTP, réponses JSON, en-têtes OWASP & gestion d'erreurs
- `services/security_owasp.py`    : Rate-limiting, validation regex, politique MDP & HMAC-SHA256
- `services/accounting_service.py`: Moteur comptable (journaux, lettrage FIFO, bons de livraison)
- `services/serializers.py`       : Sérialiseurs JSON normalisés (DTO)
- `controllers/*_controller.py`   : 10 contrôleurs métier indépendants (1 fichier par domaine)
"""
from .auth_controller import LuumoAuthController
from .catalog_controller import LuumoCatalogController
from .customers_controller import LuumoCustomersController
from .dashboard_controller import LuumoDashboardController
from .fleet_controller import LuumoFleetController
from .health_controller import LuumoHealthController
from .hr_controller import LuumoHrController
from .payments_controller import LuumoPaymentsController
from .purchases_controller import LuumoPurchasesController
from .sales_controller import LuumoSalesController

__all__ = [
    'LuumoHealthController',
    'LuumoAuthController',
    'LuumoDashboardController',
    'LuumoCatalogController',
    'LuumoCustomersController',
    'LuumoSalesController',
    'LuumoPurchasesController',
    'LuumoHrController',
    'LuumoFleetController',
    'LuumoPaymentsController',
]

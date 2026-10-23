# Contrat API Luumo v1

Base : `{ODOO_URL}/api/luumo/v1` — implémenté dans [`custom_addons/luumo_api/controllers/main.py`](../custom_addons/luumo_api/controllers/main.py).

Toutes les réponses : `{ "success": true, "data": ..., ["total": n], ["currency": {...}] }`
ou `{ "success": false, "error": "message" }` (codes 400 / 401 / 403 / 404 / 422 / 500).

`currency` = `{ "name": "GNF", "symbol": "GNF", "decimals": 0, "position": "after" }`

## Authentification

| Méthode | Route | Corps | Réponse `data` |
|---|---|---|---|
| GET | `/ping` | – | `{service, odoo, region, db}` (sans auth) |
| POST | `/auth/login` | `{login, password, db?}` | `{session_id, user:{id,name,login,company:{id,name}}, currency}` |
| GET | `/auth/me` | – | `{user, currency}` |
| POST | `/auth/logout` | – | `true` |

Session : cookie `session_id`. **Web** → via le proxy Next.js (`/odoo/*`), cookie automatique.
**Mobile** → envoyer l'en-tête `Cookie: session_id=<session_id>` sur chaque requête.
`401` ⇒ session expirée ⇒ retour à l'écran de connexion.

## Tableau de bord

`GET /dashboard` →
```json
{
  "kpis": {"sales_today": 0, "orders_today": 0, "sales_month": 0, "orders_month": 0,
           "receivables": 0, "debtors": 0, "low_stock_count": 0},
  "sales_7d": [{"date": "2026-10-16", "total": 0}],
  "low_stock": [Product], "top_debtors": [Customer], "recent_orders": [Order],
  "currency": {}
}
```

## Produits

| Méthode | Route | Paramètres / corps |
|---|---|---|
| GET | `/products` | `?search=&barcode=&limit=50&offset=0` → `[Product]`, `total` |
| POST | `/products/create` | `{name, list_price, standard_price?, barcode?, default_code?, initial_qty?}` |
| POST | `/products/{id}/stock` | `{qty}` (ajustement d'inventaire : quantité physique) |

`Product = {id, name, default_code, barcode, list_price, standard_price, qty_available|null, is_storable, uom, category, image_url|null}`
(`image_url` est relatif à `ODOO_URL`.)

## Clients & crédit

| Méthode | Route | Paramètres / corps |
|---|---|---|
| GET | `/customers` | `?search=&debtors_only=1&limit&offset` → `[Customer]` |
| POST | `/customers/create` | `{name, phone?, email?, street?, city?, vat?}` |
| GET | `/customers/{id}` | → `Customer + {orders:[Order], payments:[{id,name,date,amount,journal}]}` |
| POST | `/customers/{id}/payment` | `{amount, method: "cash"|"mobile_money"|"bank", memo?}` (remboursement de dette) |

`Customer = {id, name, phone, email, street, city, vat, credit}` — `credit` = montant dû (GNF).

## Ventes

| Méthode | Route | Paramètres / corps |
|---|---|---|
| GET | `/orders` | `?partner_id=&limit=30&offset=0` → `[Order]` |
| POST | `/orders/create` | voir ci-dessous |

```json
{
  "partner_id": 12,
  "lines": [{"product_id": 3, "qty": 2, "price_unit": 15000}],
  "payment": "cash",
  "deliver": true
}
```
- `partner_id` optionnel → « Client comptoir » (interdit si `payment = "credit"`).
- `payment` : `cash` | `mobile_money` | `bank` | `credit` (crédit = facture laissée ouverte → apparaît dans le carnet de dettes).
- Effet : commande confirmée → sortie de stock → facture postée → paiement enregistré.

`Order = {id, name, date, partner:{id,name}, state, amount_total, amount_untaxed, invoice_status, payment_state, lines:[{product_id,name,qty,price_unit,subtotal}]}`
`payment_state` : `paid` | `in_payment` | `partial` | `not_paid` | `not_invoiced`.

## Mode démo

Les deux applications embarquent un **mode démo** (données fictives réalistes, Conakry) activable
sans backend : bouton « Explorer en mode démo » sur l'écran de connexion.

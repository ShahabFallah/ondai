export const receiptOcr = `LUIGI'S TRATTORIA
Via Roma 12
25/10/2026 13:42
2x Margherita      18.00
1x Tiramisu          6.50
Subtotal            24.50
VAT 10%              2.45
TOTAL EUR           26.95
VISA **** 4421
Grazie!`

export const receiptAnswer = { merchant: "Luigi's Trattoria", total: '26.95', currency: 'EUR', date: '25/10/2026', category: 'restaurant', paymentMethod: 'VISA' }

export const cardOcr = `Priya Natarajan
Head of Finance
Northwind Studio
priya@northwind.studio
+39 02 1234 5678
northwind.studio`

export const cardAnswer = { name: 'Priya Natarajan', company: 'Northwind Studio', title: 'Head of Finance', email: 'priya@northwind.studio', phone: '+39 02 1234 5678', website: 'northwind.studio' }

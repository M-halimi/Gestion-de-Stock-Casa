<?php

namespace Database\Seeders;

use App\Models\BillOfMaterial;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\ProductionService;
use Illuminate\Database\Seeder;
use RuntimeException;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $byName = fn (string $name) => Product::where('name', $name)->first();

        $recipes = [
            'Chemise homme manches longues' => [
                'notes' => 'Chemise classique, tissu coton blanc.',
                'items' => [
                    ['name' => 'Tissu coton blanc', 'qty' => 1.8],
                    ['name' => 'Bouton chemise 15mm', 'qty' => 6],
                    ['name' => 'Fil polyester blanc', 'qty' => 1],
                    ['name' => 'Fermeture éclair 20cm', 'qty' => 1],
                ],
            ],
            'Jilbab noir' => [
                'notes' => 'Jilbab ample en jacquard noir.',
                'items' => [
                    ['name' => 'Tissu jacquard noir', 'qty' => 3],
                    ['name' => 'Fil polyester noir', 'qty' => 1],
                    ['name' => 'Ruban satin 2cm', 'qty' => 0.5],
                ],
            ],
            'Gandoura beige' => [
                'notes' => 'Gandoura beige à élastique.',
                'items' => [
                    ['name' => 'Tissu coton blanc', 'qty' => 2.2],
                    ['name' => 'Bouton gandoura 20mm', 'qty' => 4],
                    ['name' => 'Fil polyester blanc', 'qty' => 1],
                    ['name' => 'Élastique 2cm', 'qty' => 1],
                ],
            ],
        ];

        foreach ($recipes as $productName => $recipe) {
            $product = $byName($productName);

            if (! $product || $product->billOfMaterial()->exists()) {
                continue;
            }

            $items = [];

            foreach ($recipe['items'] as $component) {
                $componentProduct = $byName($component['name']);

                if (! $componentProduct) {
                    continue;
                }

                $items[] = [
                    'component_id' => $componentProduct->id,
                    'quantity' => $component['qty'],
                ];
            }

            if (empty($items)) {
                continue;
            }

            BillOfMaterial::create([
                'product_id' => $product->id,
                'notes' => $recipe['notes'],
            ])->items()->createMany($items);
        }

        $service = app(ProductionService::class);
        $chemise = $byName('Chemise homme manches longues');
        $warehouse = Warehouse::where('code', 'ATE1')->first() ?? Warehouse::first();

        if (! $chemise || ! $chemise->billOfMaterial || ! $warehouse) {
            return;
        }

        try {
            $order = $service->createOrder([
                'bill_of_material_id' => $chemise->billOfMaterial->id,
                'quantity' => 3,
                'warehouse_id' => $warehouse->id,
                'notes' => 'Ordre de production de démonstration.',
            ]);

            foreach ($order->items as $item) {
                $current = (float) $item->component->totalQuantity($warehouse->id);
                $required = (float) $item->total_quantity;

                if ($current >= $required) {
                    continue;
                }

                $stock = Stock::where('product_id', $item->component_id)
                    ->where('warehouse_id', $warehouse->id)
                    ->first();

                if ($stock) {
                    $stock->increment('quantity', $required - $current);
                } else {
                    Stock::create([
                        'product_id' => $item->component_id,
                        'warehouse_id' => $warehouse->id,
                        'quantity' => $required,
                    ]);
                }
            }

            $service->launchOrder($order);
            $service->completeOrder($order);
        } catch (InsufficientStockException|RuntimeException) {
            // La démo s'exécute sur des stocks aléatoires : un ordre peut
            // légitimement rester en attente faute de matière disponible.
        }
    }
}
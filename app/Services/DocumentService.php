<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Model;
use Symfony\Component\HttpFoundation\Response;

class DocumentService
{
    public function downloadSaleInvoice(Sale $sale): Response
    {
        $data = $this->saleData($sale);

        return Pdf::loadView('documents.transaction', $data)
            ->download('facture-' . $sale->reference . '.pdf');
    }

    public function printSaleInvoice(Sale $sale): View
    {
        return view('documents.transaction', $this->saleData($sale, true));
    }

    public function downloadPurchaseDocument(Purchase $purchase): Response
    {
        $data = $this->purchaseData($purchase);

        return Pdf::loadView('documents.transaction', $data)
            ->download('bon-commande-' . $purchase->reference . '.pdf');
    }

    public function printPurchaseDocument(Purchase $purchase): View
    {
        return view('documents.transaction', $this->purchaseData($purchase, true));
    }

    private function saleData(Sale $sale, bool $print = false): array
    {
        return $this->transactionData(
            document: $sale,
            type: 'invoice',
            title: 'Facture',
            partyLabel: 'Client',
            party: $sale->customer,
            print: $print,
        );
    }

    private function purchaseData(Purchase $purchase, bool $print = false): array
    {
        return $this->transactionData(
            document: $purchase,
            type: 'purchase',
            title: 'Bon de commande fournisseur',
            partyLabel: 'Fournisseur',
            party: $purchase->supplier,
            print: $print,
        );
    }

    private function transactionData(
        Model $document,
        string $type,
        string $title,
        string $partyLabel,
        ?Model $party,
        bool $print,
    ): array {
        $document->loadMissing(['warehouse', 'items.product']);

        return [
            'document' => $document,
            'documentType' => $type,
            'title' => $title,
            'partyLabel' => $partyLabel,
            'party' => $party,
            'items' => $document->items,
            'settings' => app(SettingsService::class)->all(),
            'print' => $print,
        ];
    }
}

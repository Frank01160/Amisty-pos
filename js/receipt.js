// ============================================
// AMISTY POS - RECEIPT GENERATION & PRINTING
// ============================================

class ReceiptManager {
    static async generateReceiptHTML(transaction, settings = {}) {
        const shopSettings = settings.shopName ? settings : await DataService.getSettings();
        const now = new Date();
        
        const receiptNumber = `${shopSettings.receiptPrefix || 'AMI-'}${now.getFullYear()}-${String(transaction.id || '').slice(-4).padStart(4, '0')}`;
        
        let html = `
        <div class="receipt-print" style="width: 80mm; font-family: 'Courier New', monospace; font-size: 11px; padding: 5mm;">
            <div style="text-align: center;">
        `;
        
        // Logo
        if (shopSettings.logoUrl && shopSettings.showLogoOnReceipt !== false) {
            html += `<img src="${shopSettings.logoUrl}" style="max-width: 60mm; max-height: 20mm; margin-bottom: 3mm;" alt="Logo">`;
        }
        
        // Shop Info
        if (shopSettings.showShopInfoOnReceipt !== false) {
            html += `
                <div style="font-weight: bold; font-size: 14px;">${shopSettings.shopName || 'Amisty POS'}</div>
                ${shopSettings.address ? `<div style="font-size: 10px;">${shopSettings.address}</div>` : ''}
                ${shopSettings.phone ? `<div style="font-size: 10px;">Tel: ${shopSettings.phone}</div>` : ''}
            `;
        }
        
        html += `
                <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
                <div style="font-size: 10px;">
                    Date: ${Utils.formatDateTime(now)}<br>
                    Receipt #: ${receiptNumber}<br>
                    Seller: ${transaction.sellerName || 'N/A'}<br>
                    ${transaction.customerName ? `Customer: ${transaction.customerName}<br>` : ''}
                </div>
                <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
                <table style="width: 100%; font-size: 10px;">
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left;">Item</th>
                        <th style="text-align: right;">Qty</th>
                        <th style="text-align: right;">Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
        `;
        
        // Items
        transaction.items.forEach(item => {
            html += `
                <tr>
                    <td>${item.name} (${item.unit || ''})</td>
                    <td style="text-align: right;">${item.qty}</td>
                    <td style="text-align: right;">${Utils.formatCurrency(item.unitPrice, 'KES').replace('KES', '')}</td>
                    <td style="text-align: right;">${Utils.formatCurrency(item.lineTotal, 'KES').replace('KES', '')}</td>
                </tr>
            `;
        });
        
        html += `
                </table>
                <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
                <div style="font-size: 10px;">
                    <div>Subtotal: ${Utils.formatCurrency(transaction.subtotal, 'KES')}</div>
                    ${transaction.discount > 0 ? `<div>Discount: ${Utils.formatCurrency(transaction.discount, 'KES')}</div>` : ''}
                    <div style="font-weight: bold; font-size: 13px;">TOTAL: ${Utils.formatCurrency(transaction.total, 'KES')}</div>
                </div>
                <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
                <div style="font-size: 10px;">Payment: ${transaction.paymentMethod === 'cash' ? 'Cash' : 'Mobile Money'}</div>
                <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
                <div style="text-align: center; font-size: 10px;">
                    ${shopSettings.receiptFooter || 'Asante kwa kununua kwetu!<br>Karibu tena!'}
                </div>
            </div>
        </div>
        `;
        
        return { html, receiptNumber };
    }

    static async printReceipt(transaction, settings) {
        const { html } = await this.generateReceiptHTML(transaction, settings);
        
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { margin: 0; padding: 0; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }

    static async downloadReceipt(transaction, settings) {
        const { html, receiptNumber } = await this.generateReceiptHTML(transaction, settings);
        
        // Use html2pdf or simple blob download
        const blob = new Blob([`
            <!DOCTYPE html>
            <html>
            <head><style>@page { size: 80mm auto; }</style></head>
            <body>${html}</body>
            </html>
        `], { type: 'text/html' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${receiptNumber.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        
        Utils.showToast('Receipt downloaded!', 'success');
    }

    static showReceiptPreview(transaction, settings) {
        const previewDiv = document.getElementById('receiptPreview');
        if (!previewDiv) return;
        
        this.generateReceiptHTML(transaction, settings).then(({ html }) => {
            previewDiv.innerHTML = html;
            Utils.showModal('receiptModal');
        });
    }
}
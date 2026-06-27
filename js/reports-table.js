// ============================================
// AMISTY POS - REPORTS EXPORT (Excel & PDF)
// ============================================

class ReportsExporter {
    // Export to Excel
    static exportToExcel(transactions, summary, filters) {
        const wb = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
            ['AMISTY POS - Transaction Report'],
            [`Period: ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}`],
            [''],
            ['SUMMARY'],
            ['Total Sales', Utils.formatCurrency(summary.totalSales, 'KES')],
            ['Total Transactions', summary.totalTransactions],
            ['Total Profit', Utils.formatCurrency(summary.totalProfit, 'KES')],
            ['Total Discounts', Utils.formatCurrency(summary.totalDiscount, 'KES')],
            ['Cash Sales', Utils.formatCurrency(summary.cashSales, 'KES')],
            ['Mobile Money Sales', Utils.formatCurrency(summary.mobileSales, 'KES')],
            [''],
        ];
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
        
        // Transactions sheet
        const transactionData = [
            ['Date & Time', 'Receipt #', 'Customer', 'Products', 'Qty', 'Unit Price', 'Total', 'Discount', 'Payment', 'Seller', 'Profit']
        ];
        
        transactions.forEach(t => {
            t.items.forEach(item => {
                transactionData.push([
                    Utils.formatDateTime(t.dateTime),
                    t.receiptNumber || '',
                    t.customerName || 'Walk-in',
                    `${item.name} (${item.unit || ''})`,
                    item.qty,
                    Utils.formatCurrency(item.unitPrice, 'KES'),
                    Utils.formatCurrency(item.lineTotal, 'KES'),
                    Utils.formatCurrency(t.discount || 0, 'KES'),
                    t.paymentMethod === 'cash' ? 'Cash' : 'Mobile Money',
                    t.sellerName || 'N/A',
                    Utils.formatCurrency((item.lineTotal || 0) - (item.costTotal || 0), 'KES')
                ]);
            });
        });
        
        const transactionsWs = XLSX.utils.aoa_to_sheet(transactionData);
        XLSX.utils.book_append_sheet(wb, transactionsWs, 'Transactions');
        
        // Auto-size columns
        const wsColWidth = transactionsData[0].map((_, i) => ({ wch: 20 }));
        transactionsWs['!cols'] = wsColWidth;
        
        XLSX.writeFile(wb, `Amisty_POS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showToast('Excel report downloaded!', 'success');
    }

    // Export to PDF
    static exportToPDF(transactions, summary, filters, settings) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 10;
        
        // Header
        doc.setFontSize(18);
        doc.setTextColor(255, 107, 53);
        doc.text('AMISTY POS - Transaction Report', pageWidth / 2, y, { align: 'center' });
        
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}`, pageWidth / 2, y, { align: 'center' });
        
        y += 6;
        doc.text(`Generated: ${Utils.formatDateTime(new Date())}`, pageWidth / 2, y, { align: 'center' });
        
        // Summary boxes
        y += 10;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        const summaryItems = [
            ['Total Sales', Utils.formatCurrency(summary.totalSales, 'KES')],
            ['Transactions', summary.totalTransactions.toString()],
            ['Profit', Utils.formatCurrency(summary.totalProfit, 'KES')],
            ['Discounts', Utils.formatCurrency(summary.totalDiscount, 'KES')]
        ];
        
        summaryItems.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${label}:`, 14, y);
            doc.setFont(undefined, 'normal');
            doc.text(value, 50, y);
            y += 5;
        });
        
        // Transactions table
        y += 5;
        doc.autoTable({
            startY: y,
            head: [['Date & Time', 'Receipt #', 'Customer', 'Products', 'Qty', 'Price', 'Total', 'Discount', 'Payment', 'Profit']],
            body: transactions.map(t => {
                const firstItem = t.items[0] || {};
                return [
                    Utils.formatDateTime(t.dateTime),
                    t.receiptNumber || '',
                    t.customerName || 'Walk-in',
                    firstItem.name || '',
                    firstItem.qty || '',
                    Utils.formatCurrency(firstItem.unitPrice || 0, 'KES'),
                    Utils.formatCurrency(t.total || 0, 'KES'),
                    Utils.formatCurrency(t.discount || 0, 'KES'),
                    t.paymentMethod || '',
                    Utils.formatCurrency(t.profitTotal || 0, 'KES')
                ];
            }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [255, 107, 53] },
            margin: { left: 10, right: 10 }
        });
        
        doc.save(`Amisty_POS_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        Utils.showToast('PDF report downloaded!', 'success');
    }

    // Print report (browser print)
    static printReport(transactions, summary, filters) {
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        
        let tableRows = '';
        transactions.forEach(t => {
            t.items.forEach(item => {
                tableRows += `
                    <tr>
                        <td>${Utils.formatDateTime(t.dateTime)}</td>
                        <td>${t.receiptNumber || ''}</td>
                        <td>${t.customerName || 'Walk-in'}</td>
                        <td>${item.name}</td>
                        <td>${item.qty}</td>
                        <td>${Utils.formatCurrency(item.unitPrice, 'KES')}</td>
                        <td>${Utils.formatCurrency(item.lineTotal, 'KES')}</td>
                        <td>${Utils.formatCurrency(t.discount || 0, 'KES')}</td>
                        <td>${t.paymentMethod}</td>
                        <td>${t.sellerName || ''}</td>
                    </tr>
                `;
            });
        });
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Transaction Report</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                    th { background: #FF6B35; color: white; }
                    .summary { margin-bottom: 20px; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <h1>AMISTY POS - Transaction Report</h1>
                <p>Period: ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}</p>
                <div class="summary">
                    <p><strong>Total Sales:</strong> ${Utils.formatCurrency(summary.totalSales, 'KES')}</p>
                    <p><strong>Transactions:</strong> ${summary.totalTransactions}</p>
                    <p><strong>Profit:</strong> ${Utils.formatCurrency(summary.totalProfit, 'KES')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date/Time</th><th>Receipt #</th><th>Customer</th>
                            <th>Product</th><th>Qty</th><th>Price</th>
                            <th>Total</th><th>Discount</th><th>Payment</th><th>Seller</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
}
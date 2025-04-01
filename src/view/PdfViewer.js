/**
 * このファイルは後方互換性のために残されています。
 * 新しい実装は PdfView.js と PdfViewController.js に分割されています。
 */
Ext.define('PdfViewer.view.PdfContainer', {
    extend: 'PdfViewer.view.PdfView',
    xtype: 'pdfcontainer',
    
    // 既存のコードとの互換性のために、元のクラス名を維持しています。
    // 新しいコードでは PdfViewer.view.PdfView を使用してください。
    
    // デフォルトのPDF URLを設定
    config: {
        pdfUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
    },
    
    // 初期化時の処理
    initComponent: function() {
        var me = this;
        
        // PDF.jsライブラリが読み込まれているか確認
        if (typeof pdfjsLib === 'undefined') {
            console.warn('PDF.js library is not loaded. Attempting to load from CDN...');
            
            // PDF.jsをCDNから動的に読み込む
            Ext.Loader.loadScript({
                url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
                onLoad: function() {
                    console.log('PDF.js library loaded successfully');
                    
                    // ワーカーを設定
                    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                    }
                    
                    // 親クラスの初期化
                    me.callParent(arguments);
                },
                onError: function() {
                    console.error('Failed to load PDF.js library from CDN');
                    Ext.Msg.alert('Error', 'PDF.js ライブラリの読み込みに失敗しました。');
                    
                    // 親クラスの初期化
                    me.callParent(arguments);
                }
            });
        } else {
            // 親クラスの初期化
            me.callParent(arguments);
        }
    }
});

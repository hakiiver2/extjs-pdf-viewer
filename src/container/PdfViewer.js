Ext.define('PdfViewer.view.PdfContainer', {
    extend: 'Ext.container.Container',
    xtype: 'pdfviewer',

    config: {
        /**
         * @cfg {String} pdfUrl
         * 表示したいPDFファイルのURLを指定
         */
        pdfUrl: null,

        /**
         * @cfg {Number} pageNumber
         * 表示したいページ番号 (1ページ目を 1 として指定)
         */
        pageNumber: 1,

        /**
         * @cfg {Number} scale
         * PDFページの拡大率 (1.0 = 100%)
         */
        scale: 1.0
    },

    // コンテナに直接 HTML を配置し、<canvas> を用意しておく
    // （必要に応じて items: [{ xtype: 'component', autoEl: 'canvas' }] でもOK）
    html: '<canvas style="border:1px solid #ccc;"></canvas>',

    // ここで afterrender などを使って実際のPDF描画を開始
    listeners: {
        afterrender: 'onAfterRenderPdf',
        scope: 'this'
    },

    /**
     * @private
     * afterrender イベントのハンドラ
     */
    onAfterRenderPdf: function() {
        var me = this;
        var url = me.getPdfUrl();

        if (!url) {
            Ext.Msg.alert('Error', 'pdfUrl が指定されていません。');
            return;
        }

        // PDF.js の API を呼び出して、PDF をロード
        // pdfjsLib は外部CDN or ローカルに置いたJSがグローバルに読み込まれている想定
        pdfjsLib.getDocument(url).promise.then(function(pdf) {
            // ロード完了後、インスタンスプロパティとして保持しておく
            me.pdfDoc = pdf;
            // 現在の pageNumber / scale を使って描画
            me.renderPage();
        }).catch(function(err) {
            Ext.Msg.alert('Error', 'PDFの読み込みに失敗: ' + err.message);
        });
    },

    /**
     * @private
     * 現在の pageNumber / scale に従ってページをCanvasに描画
     */
    renderPage: function() {
        var me = this;

        if (!me.pdfDoc) {
            return; // まだPDFをロードできていない
        }

        var pageNum = me.getPageNumber();
        var scale   = me.getScale();

        me.pdfDoc.getPage(pageNum).then(function(page) {
            // Canvas要素を取得
            // (afterrender後であれば this.el から取得可能)
            var canvas = me.el.dom.querySelector('canvas');
            if (!canvas) {
                console.error('Canvas not found in container');
                return;
            }
            var context = canvas.getContext('2d');

            // ページビューポートを作成
            var viewport = page.getViewport({ scale: scale });

            // Canvasサイズをページサイズに合わせる
            canvas.width  = viewport.width;
            canvas.height = viewport.height;

            // PDFをCanvasにレンダリング
            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext).promise.then(function() {
                // 必要があれば、描画完了後の処理
                console.log('PDF page rendered! page=' + pageNum + ', scale=' + scale);
            });
        });
    },

    /**
     * 下記のように config の更新検知メソッド(updateXxx)を用意すると、
     * 呼び出し側で動的にプロパティを変えたときに再描画などが可能。
     * 例: component.setPageNumber(2); // 2ページ目へ
     */

    // pdfUrl が変わったら再度ドキュメントをロードして描画し直す
    updatePdfUrl: function(newUrl, oldUrl) {
        // すでに画面がレンダリングされていれば、再ロードする
        if (this.rendered && newUrl) {
            // pdfDoc をクリアして再ロード
            this.pdfDoc = null;
            this.onAfterRenderPdf();
        }
    },

    // pageNumber が変わったら再描画
    updatePageNumber: function(newNum, oldNum) {
        if (this.rendered && this.pdfDoc) {
            this.renderPage();
        }
    },

    // scale が変わったら再描画
    updateScale: function(newScale, oldScale) {
        if (this.rendered && this.pdfDoc) {
            this.renderPage();
        }
    }
});


Ext.define('PdfViewer.view.PdfViewController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.pdfviewcontroller',

    moveFirst: function () {
        var view = this.getView();
        view.setPageNumber(1);
    },

    movePrevious: function () {
        var view = this.getView();
        view.setPageNumber(view.getPageNumber() - 1);
    },

    moveNext: function () {
        var view = this.getView();
        view.setPageNumber(view.getPageNumber() + 1);
    },

    moveLast: function () {
        var view = this.getView();
        view.setPageNumber(view.pdfDoc.numPages);
    },

    onPagingKeyDown: function (field, e) {
        var view = this.getView(),
            k = e.getKey();

        if (k == e.RETURN) {
            e.stopEvent();
            var value = field.getValue();
            
            if (view.pdfDoc && value) {
                var pageNum = parseInt(value, 10);
                var pageCount = view.pdfDoc.numPages;
                
                if (!isNaN(pageNum)) {
                    pageNum = Math.min(Math.max(1, pageNum), pageCount);
                    view.setPageNumber(pageNum);
                }
            }
        }
    },

    onPagingBlur: function(field) {
        var view = this.getView();
        var value = field.getValue();
        
        if (view.pdfDoc && value) {
            var pageNum = parseInt(value, 10);
            var pageCount = view.pdfDoc.numPages;
            
            if (!isNaN(pageNum)) {
                pageNum = Math.min(Math.max(1, pageNum), pageCount);
                view.setPageNumber(pageNum);
            }
        }
    },

    onScaleChange: function (combo, newValue, oldValue) {
        var view = this.getView();
        if (newValue !== oldValue) {
            view.setScale(parseFloat(newValue));
        }
    },

    onScaleBlur: function (combo) {
        var view = this.getView();
        var value = combo.getValue();
        if (value) {
            view.setScale(parseFloat(value));
        }
    },

    onBtnZoomInClicked: function () {
        var view = this.getView();
        var scale = view.getScale();
        view.setScale(scale + 0.1);
    },

    onBtnZoomOutClicked: function () {
        var view = this.getView();
        var scale = view.getScale();
        view.setScale(scale - 0.1);
    },

    init: function() {
        // コントローラの初期化時に呼ばれる
        var me = this;
        
        // リサイズイベントのハンドラを登録
        me.resizeHandler = Ext.Function.createBuffered(function() {
            me.onResize();
        }, 300, me);
        
        Ext.EventManager.onWindowResize(me.resizeHandler, me);
    },
    
    // コンポーネント破棄時のクリーンアップ
    destroy: function() {
        var me = this;
        var view = me.getView();
        
        // リサイズイベントのハンドラを削除
        if (me.resizeHandler) {
            Ext.EventManager.removeResizeListener(me.resizeHandler, me);
            me.resizeHandler = null;
        }
        
        // PDFドキュメントのクリーンアップ
        if (view && view.pdfDoc) {
            view.pdfDoc.cleanup && view.pdfDoc.cleanup();
            view.pdfDoc.destroy && view.pdfDoc.destroy();
            view.pdfDoc = null;
        }
        
        me.callParent(arguments);
    },
    
    // ウィンドウリサイズ時の処理
    onResize: function() {
        var me = this;
        var view = me.getView();
        
        if (!view || !view.pdfDoc) return;
        
        // 現在表示中のページを再レンダリング
        me.renderVisiblePages();
    },
    
    // PDFJSの初期化
    initPdfJs: function() {
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library is not loaded');
            return false;
        }
        return true;
    },

    /**
     * @private
     * afterrender イベントのハンドラ
     */
    onAfterRenderPdf: function() {
        var me = this;
        var view = me.getView();
        var url = view.getPdfUrl();

        console.log('onAfterRenderPdf called, url:', url);

        if (!url) {
            Ext.Msg.alert('Error', 'pdfUrl が指定されていません。');
            return;
        }

        // PDFJSの初期化
        if (!me.initPdfJs()) {
            return;
        }

        // コンポーネントの参照を取得
        me.firstBtn = view.down('#first');
        me.prevBtn = view.down('#prev');
        me.nextBtn = view.down('#next');
        me.lastBtn = view.down('#last');
        me.inputItem = view.down('#inputItem');
        me.scaleCombo = view.down('#scaleCombo');

        // PDFビューアー要素を取得
        var viewer = me.getPdfViewerElement();
        if (!viewer) {
            console.error('PDF viewer element not found');
            Ext.Msg.alert('Error', 'PDFビューアー要素が見つかりません。');
            return;
        }

        // スクロールイベントのリスナーを追加
        if (viewer.addEventListener) {
            viewer.addEventListener('scroll', Ext.Function.createBuffered(function() {
                me.onViewerScroll();
            }, 100, me));
        }

        console.log('Loading PDF from URL:', url);

        // PDF.js の API を呼び出して、PDF をロード
        pdfjsLib.getDocument(url).promise.then(function(pdf) {
            console.log('PDF loaded successfully, pages:', pdf.numPages);
            const numPages = pdf.numPages;

            // ロード完了後、インスタンスプロパティとして保持しておく
            view.pdfDoc = pdf;
            
            // ページ数が分かったので、ボタンを有効化
            if (me.firstBtn) me.firstBtn.setDisabled(false);
            if (me.prevBtn) me.prevBtn.setDisabled(false);
            if (me.nextBtn) me.nextBtn.setDisabled(false);
            if (me.lastBtn) me.lastBtn.setDisabled(false);
            if (me.inputItem) {
                me.inputItem.setDisabled(false);
                me.inputItem.setValue(view.getPageNumber());
                me.inputItem.setMaxValue(numPages);
            }
            if (me.scaleCombo) me.scaleCombo.setDisabled(false);
            
            // 現在のビューアー内のすべての要素をクリア
            while (viewer.firstChild) {
                viewer.removeChild(viewer.firstChild);
            }
            
            // ページのプレースホルダーを作成
            me.createPagePlaceholders(numPages);
            
            // 表示中のページをレンダリング
            me.renderVisiblePages();
            
        }).catch(function(err) {
            console.error('Error loading PDF:', err);
            Ext.Msg.alert('Error', 'PDFの読み込みに失敗: ' + err.message);
        });
    },
    
    /**
     * PDFのページプレースホルダーを作成
     * @private
     */
    createPagePlaceholders: function(numPages) {
        var me = this;
        var viewer = me.getPdfViewerElement();
        
        if (!viewer) return;
        
        Ext.suspendLayouts();
        
        for (var i = 1; i <= numPages; i++) {
            var pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.dataset.pageNumber = i;
            pageContainer.style.position = 'relative';
            pageContainer.style.margin = '10px auto';
            
            var canvas = document.createElement('canvas');
            canvas.className = 'pdf-page';
            canvas.dataset.pageNumber = i;
            
            pageContainer.appendChild(canvas);
            viewer.appendChild(pageContainer);
        }
        
        Ext.resumeLayouts(true);
    },
    
    /**
     * ビューアーのスクロール時に呼ばれる
     * @private
     */
    onViewerScroll: function() {
        this.renderVisiblePages();
    },
    
    /**
     * 表示中のページをレンダリング
     * @private
     */
    renderVisiblePages: function() {
        var me = this;
        var view = me.getView();
        
        if (!view || !view.pdfDoc) return;
        
        var viewer = me.getPdfViewerElement();
        if (!viewer) return;
        
        var viewerRect = viewer.getBoundingClientRect();
        var pageContainers = viewer.querySelectorAll('.pdf-page-container');
        
        // 表示中のページとその前後のページをレンダリング
        for (var i = 0; i < pageContainers.length; i++) {
            var container = pageContainers[i];
            var rect = container.getBoundingClientRect();
            
            // ページが表示領域内またはその近くにあるかどうかを確認
            var isVisible = (
                rect.top < viewerRect.bottom + 1000 && // 下方向に1000px余分に読み込む
                rect.bottom > viewerRect.top - 500     // 上方向に500px余分に読み込む
            );
            
            if (isVisible) {
                var pageNum = parseInt(container.dataset.pageNumber, 10);
                var canvas = container.querySelector('canvas');
                
                if (canvas && !canvas.hasAttribute('data-rendered')) {
                    me.renderPage(pageNum, canvas).then(function() {
                        canvas.setAttribute('data-rendered', 'true');
                    }).catch(function(err) {
                        console.error('Error rendering page:', err);
                    });
                }
            }
        }
    },

    /**
     * PDFビューアーコンポーネントを取得
     * @private
     */
    getPdfViewerElement: function() {
        return document.getElementById('pdf-viewer');
    },
    
    /**
     * 指定ページのCanvasを取得
     * @private
     */
    getCanvasForPage: function(pageNum) {
        var canvases = this.getPdfViewerElement().querySelectorAll('canvas');
        if (canvases.length >= pageNum) {
            return canvases[pageNum - 1]; // 0-based indexをページ番号に合わせる
        }
        return null;
    },

    /**
     * @private
     * 現在の pageNumber / scale に従ってページをCanvasに描画
     */
    renderPage: function(pageNum, canvas) {
        var me = this;
        var view = me.getView();
        const deferred = new Ext.Deferred();

        if (!view.pdfDoc) {
            console.error('PDF document not loaded');
            return deferred.reject('PDF document not loaded'); // まだPDFをロードできていない
        }

        var scale = view.getScale();
        console.log('Rendering page', pageNum, 'with scale', scale);

        try {
            view.pdfDoc.getPage(pageNum).then(function(page) {
                console.log('Got page', pageNum);
                // Canvas要素を取得
                if (!canvas) {
                    console.error('Canvas not found in container');
                    return deferred.reject('Canvas not found');
                }
                
                try {
                    var context = canvas.getContext('2d');

                    // ページビューポートを作成
                    var viewport = page.getViewport({ scale: scale });
                    console.log('Viewport created', viewport.width, viewport.height);

                    // Canvasサイズをページサイズに合わせる
                    canvas.width  = viewport.width;
                    canvas.height = viewport.height;

                    // PDFをCanvasにレンダリング
                    var renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    
                    console.log('Starting render of page', pageNum);
                    page.render(renderContext).promise.then(function() {
                        // 必要があれば、描画完了後の処理
                        console.log('PDF page rendered! page=' + pageNum + ', scale=' + scale);
                        return deferred.resolve();
                    }).catch(function(err) {
                        console.error('Error rendering PDF page:', err);
                        return deferred.reject(err);
                    });
                } catch (err) {
                    console.error('Error setting up canvas for rendering:', err);
                    return deferred.reject(err);
                }
            }).catch(function(err) {
                console.error('Error getting PDF page:', err);
                return deferred.reject(err);
            });
        } catch (err) {
            console.error('Unexpected error in renderPage:', err);
            return deferred.reject(err);
        }

        return deferred.promise;
    },

    // pdfUrl が変わったら再度ドキュメントをロードして描画し直す
    updatePdfUrl: function(newUrl, oldUrl) {
        var view = this.getView();
        // すでに画面がレンダリングされていれば、再ロードする
        if (view.rendered && newUrl) {
            // pdfDoc をクリアして再ロード
            view.pdfDoc = null;
            this.onAfterRenderPdf();
        }
    },

    // config プロパティの変更を監視するメソッド
    // これらのメソッドは view の updateXxx メソッドから呼び出される
    
    /**
     * 指定したページにスクロール
     * @private
     */
    scrollToPage: function(pageNum) {
        var me = this;
        var viewer = me.getPdfViewerElement();
        if (!viewer) return;
        
        var pageContainer = viewer.querySelector('.pdf-page-container[data-page-number="' + pageNum + '"]');
        if (pageContainer) {
            // ページコンテナの位置までスクロール
            pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },
    
    // pageNumber が変わったら再描画
    updatePageNumber: function(newNum, oldNum) {
        var me = this;
        var view = me.getView();
        if (!view.rendered || !view.pdfDoc) return;
        
        // ページ番号入力欄を更新
        if (me.inputItem) {
            me.inputItem.setValue(newNum);
        }
        
        // 指定したページにスクロール
        me.scrollToPage(newNum);
        
        // 表示中のページを再レンダリング
        me.renderVisiblePages();
    },

    // scale が変わったら再描画
    updateScale: function(newScale, oldScale) {
        var me = this;
        var view = me.getView();
        if (!view.rendered || !view.pdfDoc) return;
        
        // スケールコンボボックスを更新
        if (me.scaleCombo) {
            me.scaleCombo.setValue(newScale);
        }
        
        // すべてのページのレンダリング状態をリセット
        var canvases = me.getPdfViewerElement().querySelectorAll('canvas');
        for (var i = 0; i < canvases.length; i++) {
            canvases[i].removeAttribute('data-rendered');
        }
        
        // 表示中のページを再レンダリング
        me.renderVisiblePages();
    }
});

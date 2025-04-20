Ext.define('PdfViewer.view.PdfViewController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.pdfviewcontroller',

    init: function() {
        // コントローラの初期化時に呼ばれる
        const me = this;
        
        // リサイズイベントのハンドラを登録
        me.resizeHandler = Ext.Function.createBuffered(function() {
            me.onResize();
        }, 100, me);
        
        Ext.EventManager.onWindowResize(me.resizeHandler, me);
    },

    //onPdfViewerAfterRenderで定義しているscrollイベントリスナーを削除
    suspendContainerEvents: function() {
        const pdfViewerContainer = this.getView().down('#pdfViewerContainer');
        if (pdfViewerContainer) {
            pdfViewerContainer.getEl().suspendEvents();
        }
    },

    resumeContainerEvents: function() {
        const pdfViewerContainer = this.getView().down('#pdfViewerContainer');
        if (pdfViewerContainer) {
            pdfViewerContainer.getEl().resumeEvents();
        }
    },

    moveFirst: function () {
        this.suspendContainerEvents();
        this.getView().setPageNumber(1);
        this.updatePageNumber()
    },

    movePrevious: function () {
        const view = this.getView();
        this.suspendContainerEvents();
        view.setPageNumber(view.getPageNumber() - 1);
        this.updatePageNumber()
    },

    moveNext: function () {
        const view = this.getView();
        this.suspendContainerEvents();
        view.setPageNumber(view.getPageNumber() + 1);
        this.updatePageNumber()
    },

    moveLast: function () {
        const view = this.getView();
        this.suspendContainerEvents();
        view.setPageNumber(view.pdfDoc.numPages);
        this.updatePageNumber()
    },

    onPagingKeyDown: function (field, e) {
        const view = this.getView(),
            k = e.getKey();

        if (k == e.RETURN) {
            e.stopEvent();
            const value = field.getValue();
            
            if (view.pdfDoc && value) {
                const pageNum = parseInt(value, 10);
                const pageCount = view.pdfDoc.numPages;
                
                if (!isNaN(pageNum)) {
                    pageNum = Math.min(Math.max(1, pageNum), pageCount);
                    view.setPageNumber(pageNum);
                    this.updatePageNumber()
                }
            }
        }
    },

    onPagingBlur: function(field) {
        const view = this.getView();
        const value = field.getValue();
        
        if (view.pdfDoc && value) {
            const pageNum = parseInt(value, 10);
            const pageCount = view.pdfDoc.numPages;
            
            if (!isNaN(pageNum)) {
                pageNum = Math.min(Math.max(1, pageNum), pageCount);
                view.setPageNumber(pageNum);
                this.updatePageNumber()
            }
        }
    },

    onScaleChange: function (combo, newValue, oldValue) {
        const view = this.getView();
        if (newValue !== oldValue) {
            view.setScale(parseFloat(newValue));
        }
    },

    onScaleBlur: function (combo) {
        const view = this.getView();
        const value = combo.getValue();
        if (value) {
            view.setScale(parseFloat(value));
        }
    },

    onBtnZoomInClicked: function (a, b, c, d, e) {
        const view = this.getView();
        const scale = view.getScale();
        const combo = view.up().down('#scaleCombo');
        const store = combo.getStore();
        const scaleValue = store.findRecord('value', scale);
        if (scaleValue) {
            const index = store.indexOf(scaleValue);
            if (index < store.getCount() - 1) {
                view.setScale(store.getAt(index + 1).get('value'));
            }
        }
    },

    onBtnZoomOutClicked: function () {
        const view = this.getView();
        const scale = view.getScale();
        const combo = view.up().down('#scaleCombo');
        const store = combo.getStore();
        const scaleValue = store.findRecord('value', scale);
        if (scaleValue) {
            const index = store.indexOf(scaleValue);
            if (index > 0) {
                view.setScale(store.getAt(index - 1).get('value'));
            }
        }
    },

    // コンポーネント破棄時のクリーンアップ
    destroy: function() {
        const me = this;
        const view = me.getView();
        
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
        const me = this;
        const view = me.getView();
        
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
        const me = this;
        const view = me.getView();
        const url = view.getPdfUrl();

        console.log('onAfterRenderPdf called, url:', url);

        if (!url) {
            // Ext.Msg.alert('Error', 'pdfUrl が指定されていません。');
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
        me.printButton = view.down('#printButton');

        // PDFビューアー要素を取得
        const viewer = me.getPdfViewerElement();
        if (!viewer) {
            console.error('PDF viewer element not found');
            Ext.Msg.alert('Error', 'PDFビューアー要素が見つかりません。');
            return;
        }


        // PDF.js の API を呼び出して、PDF をロード
        pdfjsLib.getDocument(url).promise.then(function(pdf) {
            const numPages = pdf.numPages;

            // ロード完了後、インスタンスプロパティとして保持しておく
            view.pdfDoc = pdf;
            
            // ViewModelに最大ページ数を設定
            me.getViewModel().set('maxPage', numPages);
            
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
            if (me.printButton) me.printButton.setDisabled(false);
            if (me.printButton) me.printButton.setVisible(view.getShowPrintButton());
            
            // 現在のビューアー内のすべての要素をクリア
            while (viewer.firstChild) {
                viewer.removeChild(viewer.firstChild);
            }
            
            // ページのプレースホルダーを作成
            me.createPagePlaceholders(numPages);
            
            // 表示中のページをレンダリング
            me.renderVisiblePages();

            // me.getViewModel().set('maxPageNumber', numPages);
            
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
        const me = this;
        const viewer = me.getPdfViewerElement();
        
        if (!viewer) return;
        
        Ext.suspendLayouts();
        
        for (let i = 1; i <= numPages; i++) {
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.dataset.pageNumber = i;
            pageContainer.style.position = 'relative';
            pageContainer.style.margin = '10px auto';
            
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page';
            canvas.dataset.pageNumber = i;
            
            pageContainer.appendChild(canvas);
            viewer.appendChild(pageContainer);
        }
        
        Ext.resumeLayouts(true);
    },

    onPdfViewerAfterRender: function(viewer) {
        const me = this;

        // スクロールイベントリスナーを追加
        viewer.getEl().on('scroll', function() {
            me.onPdfViewerScroll();
        })
    },

    onPdfViewerScroll: function() {
        const me = this;

        // 現在のページ番号を更新
        const viewer = me.getPdfViewerElement();
        if (!viewer) return;
        const scrollTop = viewer.scrollTop;
        const pageContainers = viewer.querySelectorAll('.pdf-page-container');

        let currentPageNum = 1;

        for (let i = 0; i < pageContainers.length; i++) {
            const container = pageContainers[i];
            const rect = container.getBoundingClientRect();
            
            // ページが表示領域内にあるかどうかを確認
            // 半分以上が表示されている場合に現在のページとする
            // scaleが変わった場合、ページの高さが変わるので、表示領域の高さを考慮する
            if (rect.top < viewer.clientHeight && rect.bottom > viewer.clientHeight / 2) {
                currentPageNum = i + 1;
                break;
            }

            // const viewerRect = viewer.getBoundingClientRect();
            // const pageHeight = rect.height;
            // const pageTop = rect.top - viewerRect.top + scrollTop;
            // const pageBottom = pageTop + pageHeight;
            // const viewerHeight = viewerRect.height;
            // const isVisible = (
            //     pageTop < scrollTop + viewerHeight &&
            //     pageBottom > scrollTop
            // );
            // if (isVisible) {
            //     const pageNum = parseInt(container.dataset.pageNumber, 10);
            //     currentPageNum = pageNum;
            //     break;
            // }
            //
            // // ページが表示領域内にある場合、ページ番号を更新 
            // if (pageTop < scrollTop + viewerHeight && pageBottom > scrollTop) {
            //     const pageNum = parseInt(container.dataset.pageNumber, 10);
            //     currentPageNum = pageNum;
            //     break;
            // }

        }

        me.getView().setPageNumber(currentPageNum);
        // ページ番号を入力フィールドに設定
        me.inputItem.setValue(currentPageNum);

    },
    
    /**
     * 表示中のページをレンダリング
     * @private
     */
    renderVisiblePages: function() {
        const me = this;
        const view = me.getView();
        
        if (!view || !view.pdfDoc) return;
        
        const viewer = me.getPdfViewerElement();
        if (!viewer) return;
        
        const viewerRect = viewer.getBoundingClientRect();
        const pageContainers = viewer.querySelectorAll('.pdf-page-container');
        
        // 表示中のページとその前後のページをレンダリング
        for (let i = 0; i < pageContainers.length; i++) {
            const container = pageContainers[i];
            const rect = container.getBoundingClientRect();
            
            // ページが表示領域内またはその近くにあるかどうかを確認
            const isVisible = (
                rect.top < viewerRect.bottom + 1000 && // 下方向に1000px余分に読み込む
                rect.bottom > viewerRect.top - 500     // 上方向に500px余分に読み込む
            );
            
            if (isVisible) {
                const pageNum = parseInt(container.dataset.pageNumber, 10);
                const canvas = container.querySelector('canvas');
                
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
        return document.getElementById('pdf-viewer-component');
    },
    
    /**
     * 指定ページのCanvasを取得
     * @private
     */
    getCanvasForPage: function(pageNum) {
        const canvases = this.getPdfViewerElement().querySelectorAll('canvas');
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
        const me = this;
        const view = me.getView();
        const deferred = new Ext.Deferred();

        if (!view.pdfDoc) {
            console.error('PDF document not loaded');
            return deferred.reject('PDF document not loaded'); // まだPDFをロードできていない
        }

        const scale = view.getScale();
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
                    const context = canvas.getContext('2d');

                    // ページビューポートを作成
                    const viewport = page.getViewport({ scale: scale });
                    console.log('Viewport created', viewport.width, viewport.height);

                    // Canvasサイズをページサイズに合わせる
                    canvas.width  = viewport.width;
                    canvas.height = viewport.height;

                    // PDFをCanvasにレンダリング
                    const renderContext = {
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
        const view = this.getView();
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
        const me = this;
        const viewer = me.getPdfViewerElement();
        if (!viewer) return;
        
        const pageContainer = viewer.querySelector('.pdf-page-container[data-page-number="' + pageNum + '"]');
        if (pageContainer) {
            // ページコンテナの位置までスクロール
            pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },
    
    // pageNumber が変わったら再描画
    updatePageNumber: function(newNum, oldNum) {
        const me = this;
        const view = me.getView();
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
        const me = this;
        const view = me.getView();
        if (!view.rendered || !view.pdfDoc) return;
        
        // スケールコンボボックスを更新
        if (me.scaleCombo) {
            me.scaleCombo.setValue(newScale);
        }
        
        // すべてのページのレンダリング状態をリセット
        const canvases = me.getPdfViewerElement().querySelectorAll('canvas');
        for (let i = 0; i < canvases.length; i++) {
            canvases[i].removeAttribute('data-rendered');
        }
        
        // 表示中のページを再レンダリング
        me.renderVisiblePages();
    },

    onAfterrenderPdfViewerComponent: function(cmp) {
        const el = document.createElement('div');
        el.id = 'pdf-viewer-component';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.overflow = 'auto';
        el.style.position = 'relative';
        cmp.getEl().dom.appendChild(el);
    },

    onDownloadButtonClick: function() {
        const view = this.getView();
        const pdfUrl = view.getPdfUrl();
        
        if (pdfUrl) {
            // PDFをダウンロード
            const alink = document.createElement('a');
            alink.download = view.getPdfName() || 'download.pdf';
            alink.href = view.getPdfDownloadUrl() || pdfUrl;
            if (window.navigator.msSaveBlob) {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", alink.href, true);
                xhr.responseType = "blob";
                xhr.onload = function (e) {
                    const blob = xhr.response;
                    window.navigator.msSaveBlob(blob, alink.download);
                }
                xhr.send();
            } else {
                const mouseEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
                alink.dispatchEvent(mouseEvent)
            }
        } else {
            Ext.Msg.alert('Error', 'PDF URL is not specified.');
        }
    },

    // pdfを印刷する(PrintJs)
    onPrintButtonClick: function() {

        fetch(this.getView().getPdfUrl(), { method: 'GET' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not OK');
                }
                return response.blob();
            })
            .then(pdfBlob => {
                const blobUrl = URL.createObjectURL(pdfBlob);
                printJS({
                    // printable: this.getView().getPdfUrl(),
                    printable: blobUrl,
                    type: 'pdf',
                });
            })
            .catch(error => {
                console.error('Error fetching PDF:', error);
            });
    },

    updateShowPrintButton: function(newValue) {
        const view = this.getView();
        if (!view.rendered) return;
        if (me.printButton) {
            me.printButton.setHidden(!newValue);
        }
    }
});

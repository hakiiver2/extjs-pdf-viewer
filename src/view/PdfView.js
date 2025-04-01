Ext.define('PdfViewer.view.PdfView', {
    extend: 'Ext.panel.Panel',
    xtype: 'pdfviewer',
    
    controller: 'pdfviewcontroller',
    viewModel: true,

    config: {
        /**
         * @cfg {String} pdfUrl
         * 表示したいPDFファイルのURLを指定
         */
        pdfUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',

        /**
         * @cfg {Number} pageNumber
         * 表示したいページ番号 (1ページ目を 1 として指定)
         */
        pageNumber: 1,

        /**
         * @cfg {Number} scale
         * PDFページの拡大率 (1.0 = 100%)
         */
        scale: 1.0,
    },
    
    // 初期化時にPDF.jsライブラリが読み込まれているか確認
    initComponent: function() {
        this.callParent(arguments);
        
        // PDF.jsライブラリが読み込まれているか確認
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library is not loaded. Please include it in your application.');
        }
    },

    layout: 'fit',      
    autoScroll: true,
    border: false,
    bodyPadding: 0,
    
    // PDFビューアーコンポーネント
    items: [{
        xtype: 'component',
        itemId: 'pdfViewerComponent',
        autoEl: {
            tag: 'div',
            cls: 'pdf-viewer-container'
        },
        listeners: {
            afterrender: function(cmp) {
                // コンポーネントがレンダリングされた後にPDFビューア要素を作成
                var el = document.createElement('div');
                el.id = 'pdf-viewer';
                el.style.width = '100%';
                el.style.height = 'auto';
                el.style.overflow = 'auto';
                el.style.position = 'relative';
                cmp.getEl().dom.appendChild(el);
            }
        }
    }],
    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'bottom',
            items: [
                {
                    itemId: 'first',
                    iconCls: 'ext ext-double-chevron-left',
                    disabled: true,
                    listeners: {
                        click: 'moveFirst',
                        scope: 'controller'
                    }
                }, {
                    itemId: 'prev',
                    iconCls: 'ext ext-chevron-left',
                    disabled: true,
                    listeners: {
                        click: 'movePrevious',
                        scope: 'controller'
                    }
                        }, '-', {
                            xtype: 'numberfield',
                            itemId: 'inputItem',
                            name: 'inputItem',
                            width: 50,
                            minValue: 1,
                            allowDecimals: false,
                            hideTrigger: true,
                            keyNavEnabled: false,
                            mouseWheelEnabled: false,
                            disabled: true,
                            listeners: {
                                keydown: 'onPagingKeyDown',
                                blur: 'onPagingBlur',
                                scope: 'controller'
                            }
                }, '-', {
                    itemId: 'next',
                    iconCls: 'ext ext-chevron-right',
                    disabled: true,
                    listeners: {
                        click: 'moveNext',
                        scope: 'controller'
                    }
                }, {
                    itemId: 'last',
                    iconCls: 'ext ext-double-chevron-right',
                    disabled: true,
                    listeners: {
                        click: 'moveLast',
                        scope: 'controller'
                    }
                }, '->', {
                    xtype: 'button',
                    iconCls: 'fa fa-search-plus',
                    tooltip: 'Zoom in',
                    listeners: {
                        click: 'onBtnZoomInClicked',
                        scope: 'controller'
                    }
                }, {
                    itemId: 'scaleCombo',
                    xtype: 'combobox',
                    width: 80,
                    store: [
                        [0.5, '50%'],
                        [0.75, '75%'],
                        [1.0, '100%'],
                        [1.25, '125%'],
                        [1.5, '150%'],
                        [2.0, '200%']
                    ],
                    value: 1.0,
                    editable: false,
                    disabled: true,
                    listeners: {
                        change: 'onScaleChange',
                        blur: 'onScaleBlur',
                        scope: 'controller'
                    }
                }, {
                    xtype: 'button',
                    tooltip: 'Zoom out',
                    iconCls: 'fa fa-search-minus',
                    listeners: {
                        click: 'onBtnZoomOutClicked',
                        scope: 'controller'
                    }
                }
            ]
        }
    ],

    // ここで afterrender などを使って実際のPDF描画を開始
    listeners: {
        afterrender: 'onAfterRenderPdf',
        scope: 'controller'
    },
    
    /**
     * 下記のように config の更新検知メソッド(updateXxx)を用意すると、
     * 呼び出し側で動的にプロパティを変えたときに再描画などが可能。
     * 例: component.setPageNumber(2); // 2ページ目へ
     */

    // pdfUrl が変わったら再度ドキュメントをロードして描画し直す
    updatePdfUrl: function(newUrl, oldUrl) {
        // コントローラに処理を委譲
        var controller = this.getController();
        if (controller) {
            controller.updatePdfUrl(newUrl, oldUrl);
        }
    },

    // pageNumber が変わったら再描画
    updatePageNumber: function(newNum, oldNum) {
        // コントローラに処理を委譲
        var controller = this.getController();
        if (controller) {
            controller.updatePageNumber(newNum, oldNum);
        }
    },

    // scale が変わったら再描画
    updateScale: function(newScale, oldScale) {
        // コントローラに処理を委譲
        var controller = this.getController();
        if (controller) {
            controller.updateScale(newScale, oldScale);
        }
    }
});

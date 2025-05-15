Ext.define('PdfViewer.view.PdfView', {
    extend: 'Ext.panel.Panel',
    xtype: 'pdfviewer',
    itemId: 'pdfViewer',
    
    controller: 'pdfviewcontroller',
    viewModel: {
        type: 'pdfviewmodel',
    },

    config: {
        /**
         * @cfg {String} pdfUrl
         * 表示したいPDFファイルのURLを指定
         */
        pdfUrl: '',

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

        /**
         * @cfg {String} pdfName
         * PDFファイル名
         * ダウンロード時に使用
         *
        */
        pdfName: '',

        /**
         * @cfg {String} pdfDownloadUrl
         * PDFファイルのダウンロードURL
         * ダウンロード時に使用
         *
         */
        pdfDownloadUrl: '',

        /**
         * @cfg {Boolean} showPrintButton
         * 印刷可能かどうか
         * true: 印刷可能, false: 印刷不可
         */
        showPrintButton: false,

        /**
         * @cfg {Boolean} showPageNumber
         * ページ番号表示
         * true: 表示, false: 非表示
         */
        showPageNumber: false,

        /**
         * @cfg {String} downloadButtonText
         * ダウンロードボタンのテキスト
         *
         */
        downloadButtonText: '',
    },
    
    // 初期化時にPDF.jsライブラリが読み込まれているか確認
    initComponent: function() {
        this.callParent(arguments);
        
        // PDF.jsライブラリが読み込まれているか確認
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library is not loaded. Please include it in your application.');
        }
    },

    border: false,
    bodyPadding: 0,
    header: false,
    layout: 'fit',
    
    // PDFビューアーコンポーネント
    items: [
        {
            xtype: 'container',
            itemId: 'pdfViewerContainer',
            cls: 'pdf-viewer-container',
            flex: 1,
            autoScroll: true,
            html: '<div id="pdf-viewer-component" ></div>',
            listeners: {
                afterrender: 'onPdfViewerAfterRender',
                scope: 'controller'
            }
        },
    ],
    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'bottom',
            height: 50,
            items: [
                // {
                //     itemId: 'first',
                //     disabled: true,
                //     text: '<<',
                //     listeners: {
                //         click: 'moveFirst',
                //         scope: 'controller'
                //     }
                // }, {
                //     itemId: 'prev',
                //     disabled: true,
                //     text: '<',
                //     bind: {
                //     },
                //     listeners: {
                //         click: 'movePrevious',
                //         scope: 'controller'
                //     }
                // }, '-',
                '->',
                {
                    xtype: 'numberfield',
                    itemId: 'inputItem',
                    name: 'inputItem',
                    width: 50,
                    minValue: 1,
                    allowDecimals: false,
                    hideTrigger: true,
                    keyNavEnabled: false,
                    mouseWheelEnabled: false,
                    editable: false,
                    disabled: true,
                    listeners: {
                        keydown: 'onPagingKeyDown',
                        blur: 'onPagingBlur',
                        scope: 'controller'
                    }
                }, 
                {
                    xtype: 'displayfield',
                    itemId: 'maxPageDisplay',
                    width: 30,
                    bind: {
                        value: '/ {maxPage}'
                    }
                }, '-',
                // {
                //     itemId: 'next',
                //     text: '>',
                //     disabled: true,
                //     bind: {
                //         // disabled: '{pageNumber == maxPageNumber}',
                //     },
                //     listeners: {
                //         click: 'moveNext',
                //         scope: 'controller'
                //     }
                // }, {
                //     itemId: 'last',
                //     text: '>>',
                //     disabled: true,
                //     listeners: {
                //         click: 'moveLast',
                //         scope: 'controller'
                //     }
                // }, '->', 
                {
                    xtype: 'button',
                    tooltip: 'Zoom out',
                    iconCls: 'fa minus-icon fa-2x',
                    scale: 'large',
                    listeners: {
                        click: 'onBtnZoomOutClicked',
                        scope: 'controller'
                    }
                },
                {
                    xtype: 'combobox',
                    itemId: 'scaleCombo',
                    width: 80,
                    height: 40,
                    store: [
                        {
                            value: 0.25,
                            text: '25%'
                        },
                        {
                            value: 0.5,
                            text: '50%'
                        },
                        {
                            value: 0.75,
                            text: '75%'
                        },
                        // 100%から1000%までの拡大率を追加
                        // 25%刻みで10段階
                        ...Array.from({ length: 37 }, (_, i) => ({
                            value: (i + 4) * 0.25,
                            text: `${(i + 4) * 25}%`
                        })),
                    ],
                    queryMode: 'local',
                    displayField: 'text',
                    valueField: 'value',
                    editable: false,
                    disabled: true,
                    value: 1.25,
                    listeners: {
                        change: 'onScaleChange',
                        blur: 'onScaleBlur',
                        scope: 'controller'
                    }
                },
                {
                    xtype: 'button',
                    iconCls: 'fa plus-icon fa-2x',
                    tooltip: 'Zoom in',
                    scale: 'large',
                    listeners: {
                        click: 'onBtnZoomInClicked',
                        scope: 'controller'
                    }
                },
                {
                    xtype: 'button',
                    // iconCls: 'fa fa-download fa-2x',
                    scale: 'large',
                    itemId: 'downloadButton',
                    tooltip: 'download',
                    userCls: 'download-button',
                    iconCls: 'fa download-icon fa-2x',
                    listeners: {
                        click: 'onDownloadButtonClick',
                        scope: 'controller'
                    }
                }, 
                '->',
                {
                    xtype: 'button',
                    iconCls: 'fa print-icon fa-2x',
                    scale: 'large',
                    tooltip: 'print',
                    disabled: true,
                    hidden: true,
                    itemId: 'printButton',
                    listeners: {
                        click: 'onPrintButtonClick',
                        scope: 'controller'
                    }
                },
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
        const controller = this.getController();
        if (controller) {
            controller.updatePdfUrl(newUrl, oldUrl);
        }
    },

    // // pageNumber が変わったら再描画
    // updatePageNumber: function(newNum, oldNum) {
    //     // コントローラに処理を委譲
    //     const controller = this.getController();
    //     if (controller) {
    //         controller.updatePageNumber(newNum, oldNum);
    //     }
    // },
    //
    // scale が変わったら再描画
    updateScale: function(newScale, oldScale) {
        // コントローラに処理を委譲
        const controller = this.getController();
        if (controller) {
            controller.updateScale(newScale, oldScale);
        }
    },

    // showPrintButton が変わったら再描画
    updateShowPrintButton: function(newIsPrint, oldIsPrint) {
        // コントローラに処理を委譲
        const controller = this.getController();
        if (controller) {
            controller.updateShowPrintButton(newIsPrint, oldIsPrint);
        }
    },

    // showPageNumber が変わったら再描画
    updateShowPageNumber: function(newIsShow, oldIsShow) {
        // コントローラに処理を委譲
        const controller = this.getController();
        if (controller) {
            controller.updateShowPageNumber(newIsShow, oldIsShow);
        }
    },

    // downloadButtonText が変わったら再描画
    updateDownloadButtonText: function(newText, oldText) {
        // コントローラに処理を委譲
        const controller = this.getController();
        if (controller) {
            controller.updateDownloadButtonText(newText, oldText);
        }
    },
});

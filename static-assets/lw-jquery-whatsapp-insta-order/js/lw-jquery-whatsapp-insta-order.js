// whatsAppInstaOrder
(function ($, window) {
    "use strict";
    $.whatsAppInstaOrder = function (el, options) { };
    // default options don't change it here
    // instead set these options at plugin initialize
    $.whatsAppInstaOrder.defaultOptions = {
        // data url for products json
        // set if other than default
        dataUrl: "",
        siteBaseUrl: '',
        // whatever to force fresh data or not
        forceFresh: false,
        // your store name
        storeName: "",
        // logo image path
        logoImage: "",
        // set currency symbol
        currencySymbol: "$",
        // currency symbol
        currency: "",
        // checkout methods
        checkoutMethods: {
            orderByWhatsApp: {
                // enable this gateway or not
                enable: true,
                mobileNumber: '', // Your Mobile Number with 0 and country code
                orderTypes: {
                    takeaway: {
                        enable: true,
                        title: "",
                    },
                    delivery: {
                        // it will enable the form to submit address information
                        enable: true,
                        title: "",
                    },
                    // will enable the table number field
                    table: {
                        enable: true,
                        title: "",
                    },
                },
                // gateway title
                title: "",
                // method name do not change
                method: "",
                // button element will be created using following information
                btnElement: {
                    id: "#",
                    class: "",
                    title:
                        '',
                    // imageUrl : 'image path for button'
                }
            }
        },
        // global shipping charges in amount
        shippingCharges: 0,
        // global tax charges
        taxPercentage: 0,
        // do you want to search product description
        searchProductDetails: true,
        // do you want to search the product ids
        searchProductIds: true,
        // do you want to search the product category ids
        searchCategoryIds: true,
        // per page item for load more
        perPageCount: 12
    };
    // whatsAppInstaOrder function starts
    $.fn.whatsAppInstaOrder = function (options) {
        // extend default options
        options = $.extend(true, {}, $.whatsAppInstaOrder.defaultOptions, options);
        // iterate through plugin
        new $.whatsAppInstaOrder(this, options);

        // config
        _.templateSettings.variable = "_oData";

        /*
            Configuration Options
        */

        var configOptions = options,
            /*
                Application Variables
            */
            // all the products container
            allProductsCollection = {},
            // category container
            categoriesCollection = {},
            // current product container
            currentProductCollection = {},
            oCurrentProductData = {},
            // searched product collection
            searchedProductsCollection = {},
            // cart product collection
            cartProductsCollection = new Array(),
            cartStats = {},
            // current selected product options
            selectedProductOptions = {},
            // number of product in the cart
            nProductInCart = false,
            // general variables
            generalVars = {
                // categoryIdentiferInURL	: "uid-",
                isStoreLoaded: false,
                // last accessed category
                lastAccessedCategory: null,
                // does hash changed
                hashChanged: false,
                //to prevent hash change action
                preventHashChangedAction: false,
                // storage name id
                cartStorageName: 'lw-store-cart-storage-' + window.location.hostname,
                // update qty delay
                qtyUpdateTimeout: null,
                // search delay for key up
                searchDelayTimeout: null,
                // submit order show delay
                showSubmitOrderTimeout: null,
                // order button enable/disable state
                enableOrderBtn: false,
                // to prevent hash change
                preventHashChange: false,
                // initial breadcrumb markup
                initialBreadcrumb: '<li class="breadcrumb-item"><a data-categoryindex="all" href="#/category/uid-all" class="category-link-all category-link">Todas</a></li>',
                parentCategoriesString: '',
                currentPaginate: 20,
                previousPaginate: 0,
                perPageCount: configOptions['perPageCount'] ? configOptions.perPageCount : 10,
                totalCount: 0,
                orderType: null
            },
            // indexes
            nCategoryIndex = 0,
            nProductIndex = 0,
            /*
                DOM elements
            */
            $domElements = {
                storeLogo: $('#storeLogo'),
                checkoutSubmitOrderBtn: $('#checkoutSubmitOrder'),
                loaderContainer: $('#loaderContainer'),
                mainContainer: $('#mainContainer'),
                modalCommon: $('#commonModal'),
                modalContainer: $('.common-modal-content'),
                categoriesList: $('#categoriesList'),
                storeLoaderStatusText: $('.lw-loading-status'),
                productsContainer: $('#productsContainer'),
                masonryProductsContainer: null,
                storeWaitingText: $('.lw-waiting-text'),
                addToCartBtnContainer: $('#addToCartBtnContainer'),
                productsBreadcrumb: $('#productsBreadcrumb'),
                shoppingCartBtnContainer: $('.shopping-cart-btn-container'),
                searchInput: $('input.search-product'),
                clearSearchBtn: $('.clear-search-result-btn'),
                footerStoreName: $('.footer-store-name'),
                goToTop: $('.go-to-top'),
                searchedProductCounts: $('#searchedProductCounts')
            },

            /*
                Templates to process as _ (underscore templates)
            */
            _templates = {
                sidebarCategories: _.template($("script.sidebar-categories-template").html()),
                productsGrid: _.template($("script.products-grid-template").html()),
                productsDetailsModal: _.template($("script.products-details-modal-template").html()),
                productsOptionsPopover: _.template($("script.product-options-popover-template").html()),
                shoppingCartModal: _.template($("script.shopping-cart-template").html()),
                whatsAppOrderTemplate: _.template($("script.whatsapp-order-template").html()),
                addToCartBtn: _.template($("script.add-to-cart-btn-template").html()),
                shoppingCartBtn: _.template($("script.shopping-cart-btn-template").html()),
                submitOrderFormModal: _.template($("script.submit-order-form-template").html())
            },

            /*
                Object contains miscellaneous functions as helpers
            */
            fnMisc = {
                /*
                    object length
                */
                objectLength: function (obj) {
                    return _.allKeys(obj).length;
                },
                /*
                    Format amount using currency symbol & code
                */
                formatAmount: function (amt) {
                    return configOptions.currencySymbol + "" + new Number(amt).toFixed(2);
                },
                /*
                    Format amount using currency symbol
                */
                fullFormatAmount: function (amt) {
                    return configOptions.currencySymbol + "" + new Number(amt).toFixed(2) + " " + configOptions.currency;
                },
                /*
                    Short details & filter html tags
                */
                sanitizeDetails: function (details) {
                    if (details) {
                        return details.replace(/(<([^>]+)>)/ig, "");
                    } else {
                        return '';
                    }
                },
                /*
                    Create url friendly string
                */
                convertToSlug: function (string) {
                    return string
                        .toLowerCase()
                        .replace(/ /g, '-')
                        .replace(/[^\w-]+/g, '');
                },
                // Query to Object
                queryToObject: function (queryStr) {
                    if (_.isString(queryStr)) {
                        var queryArr = (queryStr).replace('?', '&').split('&'),
                            queryParams = {};
                        for (var q = 0, qArrLength = queryArr.length; q < qArrLength; q++) {
                            var qArr = queryArr[q].split('=');
                            queryParams[decodeURIComponent(qArr[0])] = decodeURIComponent(qArr[1]);
                        }
                        return queryParams;
                    } else {
                        return queryStr;
                    }
                },
                /*
                    extract data from URL & convert it to object
                */
                dataFromURL: function () {
                    return _.object(
                        _.compact(
                            _.map(location.hash.slice(1).split('/'), function (urlItem) {
                                if (urlItem) {
                                    return urlItem.split("id-");
                                }
                            }))
                    );
                },
                /*
                    Go to top method
                */
                goToTop: function (e) {

                    if (e) {
                        e.preventDefault();
                    }

                    $("html, body").animate({
                        scrollTop: "0px"
                    }, {
                        duration: 200,
                        easing: "swing"
                    });
                },
                /*
                    On resize
                */
                resizeNPosition: function () {

                },
                /*
                    Format amount using currency symbol & code
                */
                uniqueIdGeneration: function (amt) {
                    var newDate = new Date();
                    return newDate.getFullYear() +
                        (((newDate.getMonth() + 1) < 10) ? '0' + (newDate.getMonth() + 1) : (newDate.getMonth() + 1)) +
                        ((newDate.getDate() < 10) ? '0' + newDate.getDate() : newDate.getDate()) +
                        +((newDate.getHours() < 10) ? '0' + newDate.getHours() : newDate.getHours()) +
                        '#' + Math.random().toString(36).substr(2, 4);
                },
            };
        fnMisc.resizeNPosition();

        _.delay(function () {
            fnMisc.resizeNPosition();
        }, 300);

        $domElements.storeLoaderStatusText.html('Loading ...');

        var DateTime = new Date;

        /*
            Lets load products data from JSON file
        */
        $.ajax({
            type: "GET",
            url: configOptions.dataUrl + ((configOptions.forceFresh === true) ? "?file=" + DateTime.getTime() : ''),
            dataType: "JSON",
            success: function (productsData) {

                $('#mainContainer').show();
                $domElements.storeLoaderStatusText.html('Initializing ...');

                var productsJSONNodes = productsData['categories'];
                /*
                    loop through the categories
                */
                storeFuncs.prepareJSONProductsData(productsJSONNodes);

                /*
                    we have all the data lets setup a store
                */
                storeFuncs.loadExistingCartItems();

            }
        }).fail(function (e, messageBody) {
            storeFuncs.showErrorMessage('Oooops... Failed to load Products data!!', e.statusText + ' : ' + messageBody);
        });

        var storeFuncs = {
            showErrorMessage: function (message, messageBody) {
                $domElements.storeWaitingText.html(message);
                $domElements.loaderContainer.find('.preloader').removeClass('preloader').addClass('lw-broken-file-link').text('');
                if (messageBody) {
                    $domElements.storeLoaderStatusText.html('<small>' + messageBody + '</small>').addClass('text-danger');
                }
            },
            /*
                Format products JSON data
            */
            prepareJSONProductsData: function (productsJSONNodes, parentCategoryID, parentLevel) {
                if (!parentLevel) {
                    parentLevel = 1;
                }

                _.each(productsJSONNodes, function (jsonCategoryItem) {

                    var sThisCategoryName = jsonCategoryItem['name'],
                        sCategoryID = jsonCategoryItem['id'] ?
                            fnMisc.convertToSlug(jsonCategoryItem['id']) : nCategoryIndex;

                    if (categoriesCollection[sCategoryID]) {
                        storeFuncs.showErrorMessage("ERROR!!", "Duplicate Category ID " + sCategoryID);
                        throw "Duplicate Category ID " + sCategoryID;
                    }

                    categoriesCollection[sCategoryID] = {
                        name: sThisCategoryName,
                        index: sCategoryID,
                        parentLevel: parentLevel,
                        parentCategoryIndex: parentCategoryID,
                        slug: fnMisc.convertToSlug(sThisCategoryName)
                    };
                    /*
                        loop through the products of this category
                    */
                    _.each(jsonCategoryItem['products'], function (thisProductNode) {

                        if (!thisProductNode['active']) {
                            return;
                        }

                        var nOldPrice = parseFloat(thisProductNode['old_price']),
                            nAdditionalShippingCharge = parseFloat(thisProductNode['additional_shipping_charge']),
                            nTaxPercentage = parseFloat(thisProductNode['tax_percentage']),
                            sThisProductName = thisProductNode['name'],
                            sProductID = thisProductNode['id'] ?
                                fnMisc.convertToSlug(thisProductNode['id']) : nProductIndex,
                            nProductPrice = parseFloat(thisProductNode['price']);

                        /*
                            Products
                        */
                        if (allProductsCollection[sProductID]) {
                            storeFuncs.showErrorMessage("ERROR!!", "Duplicate Product ID " + sProductID);
                            throw "Duplicate Product ID " + sProductID;
                        }
                        var oThisProduct = allProductsCollection[sProductID] = {
                            name: sThisProductName,
                            slug: fnMisc.convertToSlug(sThisProductName),
                            thumbPath: thisProductNode['thumbnail_path'],
                            detailsLink: thisProductNode['details_link'] ? thisProductNode['details_link'] : null,
                            price: nProductPrice,
                            outOfStock: thisProductNode['out_of_stock'] ? thisProductNode['out_of_stock'] : false,
                            formattedPrice: fnMisc.formatAmount(nProductPrice),
                            fullFormattedPrice: fnMisc.fullFormatAmount(nProductPrice),
                            oldPrice: nOldPrice ? {
                                fullFormatted: fnMisc.fullFormatAmount(nOldPrice),
                                formatted: fnMisc.formatAmount(nOldPrice),
                                price: nOldPrice
                            } : null,
                            additionalShippingCharge: _.isNumber(nAdditionalShippingCharge) ? nAdditionalShippingCharge : 0,
                            taxPercentage: _.isNumber(nTaxPercentage) ? nTaxPercentage : 0,
                            id: thisProductNode['id'],
                            index: sProductID,
                            categoryIndex: sCategoryID,
                            parentCategoryIndex: parentCategoryID,
                            details: thisProductNode['details'],
                            sanitizedDetails: fnMisc.sanitizeDetails(thisProductNode['details']),
                            productOptions: [],
                            hasAddonPrice: false,
                            calculateTax: function (totalAddonPriceForProduct, productQuantity) {

                                var taxAmount = 0;

                                if (!this.taxPercentage && configOptions.taxPercentage) {
                                    taxAmount = ((this.price + totalAddonPriceForProduct) * configOptions.taxPercentage) / 100;
                                } else {
                                    taxAmount = ((this.price + totalAddonPriceForProduct) * this.taxPercentage) / 100;
                                }

                                if (productQuantity) {
                                    return productQuantity * taxAmount;
                                }

                                return taxAmount;
                            },
                            calculateShipping: function (productQuantity) {

                                if (generalVars.orderType !== 'delivery') {
                                    return 0;
                                }

                                if (!productQuantity) {
                                    return this.additionalShippingCharge;
                                }

                                return productQuantity * this.additionalShippingCharge;
                            }
                        };

                        /*
                            product options
                        */
                        _.each(thisProductNode['options'], function (thisProductOptions) {

                            var thisProductOptionsObj = {
                                '_id': sCategoryID + '_' + sProductID + '_' + fnMisc.convertToSlug(thisProductOptions['title']),
                                'title': thisProductOptions['title'],
                                'optionValues': []
                            };

                            _.each(thisProductOptions['values'], function (thisProductOption) {

                                var nAddonPrice = _.isNumber(parseFloat(thisProductOption['addon_price'])) ?
                                    parseFloat(thisProductOption['addon_price']) : 0;

                                if (nAddonPrice > 0) {
                                    oThisProduct.hasAddonPrice = true;
                                }

                                thisProductOptionsObj.optionValues.push({
                                    name: thisProductOption['value_name'],
                                    addonPrice: nAddonPrice,
                                    addonPriceFormatted: fnMisc.formatAmount(nAddonPrice),
                                    value: (thisProductOption['value'] ?
                                        thisProductOption['value'] : thisProductOption['value_name']
                                    )
                                });

                            });

                            oThisProduct.productOptions[thisProductOptionsObj._id] = thisProductOptionsObj;

                        });

                        /*
                            increment product index
                        */
                        nProductIndex++;
                    });

                    if (jsonCategoryItem['categories'] && jsonCategoryItem['categories'].length) {
                        storeFuncs.prepareJSONProductsData(jsonCategoryItem['categories'], sCategoryID, parentLevel + 1);
                    }

                    /*
                        increment category index
                    */
                    nCategoryIndex++;
                });
            },

            /*
                setup categories
            */
            setupCategories: function () {

                $domElements.categoriesList.find(".active-category").after(
                    _templates.sidebarCategories({
                        categoriesCollection: categoriesCollection
                    })
                );

                storeFuncs.setupStore();
            },

            /*
                Retrieve Cart from local storage & update cart
            */
            loadExistingCartItems: function () {

                var sRetrievedExistingCartCollation = $.jStorage.get(generalVars.cartStorageName),
                    retrievedExistingCartCollation = $.parseJSON(sRetrievedExistingCartCollation);
                if (retrievedExistingCartCollation && retrievedExistingCartCollation.length) {
                    cartProductsCollection = retrievedExistingCartCollation;
                }

                storeFuncs.updateCart();
                storeFuncs.setupCategories();
            },
            /*
                setup products
            */
            setupStore: function () {

                storeFuncs.onAllComplete();
            },
            /*
                setup products
            */
            categoryLinkAction: function (e) {
                generalVars.preventHashChangedAction = false;
                $domElements.productsBreadcrumb.show();
                $('body').removeClass('lw-sidebar-opened');
            },
            /*
                Find parent categories
            */
            getParentCategories: function (sCategoryID, resultItems, requiredObj) {

                if (!resultItems || !resultItems.length) {
                    var resultItems = [];
                }

                if (categoriesCollection[sCategoryID]) {
                    if (requiredObj) {
                        resultItems.push(categoriesCollection[sCategoryID]);
                    } else {
                        resultItems.push(categoriesCollection[sCategoryID].parentCategoryIndex);
                    }

                    storeFuncs.getParentCategories(categoriesCollection[sCategoryID].parentCategoryIndex, resultItems, requiredObj);
                }

                return resultItems;
            },
            /*
                Find child categories
            */
            getChildCategories: function (carryCategoryID, carryChildCategories, childCategoryContainer) {

                if (!childCategoryContainer) {
                    var childCategoryContainer = [];
                }

                var findChildCategories = _.where(carryChildCategories, {
                    parentCategoryIndex: carryCategoryID
                });

                if (findChildCategories) {
                    _.each(findChildCategories, function (childCategory) {
                        childCategoryContainer.push(childCategory.index);
                        storeFuncs.getChildCategories(childCategory.index, carryChildCategories, childCategoryContainer);
                    });
                }
                return childCategoryContainer;
            },
            /*
                load products for current category
            */
            loadCategoryProducts: function (sCategoryID) {

                storeFuncs.clearSearchResult(true);

                var childCategories = storeFuncs.getChildCategories(sCategoryID, categoriesCollection);

                if (sCategoryID == 'all') {
                    currentProductCollection = allProductsCollection;
                    storeFuncs.updateBreadCrumb('all');
                } else {
                    currentProductCollection = _.filter(allProductsCollection, function (productObj) {
                        if ((productObj.categoryIndex == sCategoryID) || _.contains(childCategories, productObj.categoryIndex)) {
                            return productObj;
                        }
                    });

                    storeFuncs.updateBreadCrumb(categoriesCollection[sCategoryID]);
                };

                fnMisc.goToTop();

                $domElements.categoriesList.find('.list-group-item').removeClass('active-category active');
                $domElements.categoriesList.find('.category-list-item-' + sCategoryID).addClass('active-category active');

                generalVars.lastAccessedCategory = sCategoryID;
                storeFuncs.generateProductsThumbs();

            },
            loadMoreItems: function (e) {
                e.preventDefault();
                generalVars.previousPaginate = generalVars.currentPaginate;
                generalVars.currentPaginate = generalVars.currentPaginate + generalVars.perPageCount;
                storeFuncs.generateProductsThumbs(true);
            },
            /*
                List out the products on page
            */
            generateProductsThumbs: function (isLoadMoreItems) {
                if (!isLoadMoreItems) {
                    generalVars.currentPaginate = generalVars.perPageCount;
                    generalVars.previousPaginate = 0;
                }
                var lengthOfCurrentCollection = _.size(currentProductCollection);
                if (generalVars.currentPaginate >= lengthOfCurrentCollection) {
                    $('.lw-result-loaded-text').html('Mostrando ' + lengthOfCurrentCollection + ' de ' + lengthOfCurrentCollection);
                    $('.lw-load-more-content').hide();
                } else {
                    $('.lw-result-loaded-text').html('Mostrando ' + generalVars.currentPaginate + ' de ' + lengthOfCurrentCollection);
                    $('.lw-load-more-content').show();
                }

                var countIndex = 0,
                    itemsToLoad = _.filter(currentProductCollection, function (num, index) {
                        countIndex++;
                        if ((countIndex > generalVars.previousPaginate) && (countIndex <= generalVars.currentPaginate)) {
                            return num;
                        }
                    });

                if (generalVars.previousPaginate == 0) {

                    if ($domElements.productsContainer.data('masonry')) {
                        $domElements.productsContainer.masonry('destroy');
                        $domElements.masonryProductsContainer = null;
                    }

                    generalVars.totalCount = _.toArray(currentProductCollection).length;
                    $domElements.productsContainer.html(
                        _templates.productsGrid({
                            currentProductCollection: itemsToLoad
                        })
                    );
                    $domElements.masonryProductsContainer = $domElements.productsContainer.masonry({
                        itemSelector: '.product-item',
                        percentPosition: true,
                        horizontalOrder: true,
                        columnWidth: '.product-item',
                        gutter: '.lw-gutter-sizer'
                    });
                } else {
                    $domElements.productsContainer.append(
                        _templates.productsGrid({
                            currentProductCollection: itemsToLoad
                        })
                    );
                    $domElements.masonryProductsContainer.masonry('appended', $('.product-item-new'));
                }

                $domElements.masonryProductsContainer.masonry('once', 'layoutComplete', function () {
                    $('.product-item-new').removeClass('product-item-new');
                });

                // $domElements.storeLoaderStatusText.remove();
                // $domElements.loaderContainer.show();
                if (currentProductCollection.length <= 0) {
                    $domElements.loaderContainer.hide();
                }

                $('.product-item-thumb-image').Lazy({
                    afterLoad: function (element) {
                        // called after an element was successfully handled
                        $domElements.loaderContainer.hide();
                        $(element).parents('.product-item').addClass('fade-in');
                        $domElements.masonryProductsContainer.masonry('layout');
                        fnMisc.resizeNPosition();
                    },
                    onError: function (element) {
                        // called whenever an element could not be handled
                        $domElements.loaderContainer.hide();
                        $(element).parents('.thumb-holder').addClass('lw-image-broken').parents('.product-item').addClass('fade-in');
                        $domElements.masonryProductsContainer.masonry('layout');
                        fnMisc.resizeNPosition();
                    },
                    effect: 'fadeIn',
                    effectTime: 0
                });

                $('.product-item [data-bs-toggle="popover"]').popover({
                    container: '#productsContainer',
                    content: function (element) {
                        storeFuncs.selectCurrentProduct($(element).data('productindex'));
                        return _templates.productsOptionsPopover({
                            oCurrentProductData: oCurrentProductData,
                            fnMisc: fnMisc,
                            nProductInCart: nProductInCart
                        });
                    },
                    sanitize: false,
                    html: true
                });

                $('.product-item [data-bs-toggle="popover"]').on('shown.bs.popover', function () {
                    storeFuncs.updateAddToCartBtn();
                })

                // Close Popover if clicked outside
                $(document).on('click', function (e) {
                    $('.product-item [data-bs-toggle="popover"],.product-item [data-original-title]').each(function () {
                        //the 'is' for buttons that trigger popups
                        //the 'has' for icons within a button that triggers a popup
                        if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                            (($(this).popover('hide').data('bs.popover') || {}).inState || {}).click = false // fix for BS 3.3.6
                        }
                    });
                });
            },
            /*
                On search click
            */
            onSearch: function () {

                clearTimeout(generalVars.searchDelayTimeout);

                /*
                    wait for some time if user still typing
                */
                generalVars.searchDelayTimeout = setTimeout(function () {

                    if ($domElements.searchInput.val() == "") {
                        return false;
                    }

                    $domElements.clearSearchBtn.removeAttr('disabled');

                    var oURLData = fnMisc.dataFromURL();

                    if (oURLData.hasOwnProperty('search')) {
                        if (generalVars.preventHashChangedAction) {
                            generalVars.preventHashChangedAction = false;
                            return false;
                        }
                        storeFuncs.searchProduct();
                    } else {
                        location.hash = "#/search";
                    }
                }, 300);
            },
            /*
                Clear search result
            */
            clearSearchResult: function (preventSearchResult) {

                $domElements.searchInput.val("");
                $domElements.clearSearchBtn.attr('disabled', '');
                $domElements.searchedProductCounts.html('');

                if (!preventSearchResult) {
                    storeFuncs.searchProduct();
                }
            },
            /*
                Search for product
            */
            searchProduct: function () {

                $domElements.categoriesList.find('.list-group-item').removeClass('active-category active');

                var sSearchTerm = $domElements.searchInput.val(),
                    aSearchTerm = sSearchTerm.toLowerCase().split(' ');

                searchedProductsCollection = allProductsCollection;
                var tempSearchProductCollection = [];

                for (var i = 0; i < aSearchTerm.length; i++) {

                    var sCurrentSearchTermWord = aSearchTerm[i];

                    tempSearchProductCollection = [];

                    for (var nProductItem in searchedProductsCollection) {

                        var oProduct = searchedProductsCollection[nProductItem],
                            sProductString = oProduct.name.toLowerCase();

                        if (configOptions.searchProductDetails) {
                            sProductString += oProduct.details.toLowerCase();
                        }

                        if (configOptions.searchProductIds) {
                            sProductString += oProduct.index;
                        }

                        if (configOptions.searchCategoryIds) {
                            sProductString += oProduct.categoryIndex;
                        }

                        if (sProductString.indexOf(sCurrentSearchTermWord) > -1) {
                            tempSearchProductCollection.push(oProduct);
                        }
                    }

                    searchedProductsCollection = tempSearchProductCollection;

                };

                generalVars.lastAccessedCategory = 'search';
                $domElements.productsBreadcrumb.hide();
                $domElements.searchedProductCounts.html(searchedProductsCollection.length + ' resultados');

                if (!_.isEqual(currentProductCollection, searchedProductsCollection)) {

                    currentProductCollection = searchedProductsCollection;
                    storeFuncs.generateProductsThumbs(false);

                }
            },
            /*
                show product details
            */
            selectCurrentProduct: function (nProductIndexID) {

                oCurrentProductData = allProductsCollection[nProductIndexID];

                if (!oCurrentProductData) {
                    location.hash = "#";
                    return false;
                }

                selectedProductOptions = {};

                if (fnMisc.objectLength(oCurrentProductData.productOptions) > 0) {
                    for (var productOptionKey in oCurrentProductData.productOptions) {
                        var productOption = oCurrentProductData.productOptions[productOptionKey];

                        selectedProductOptions[productOption._id] = {
                            value: productOption.optionValues[0].value,
                            name: productOption.optionValues[0].name,
                            optionTitle: productOption.title,
                        };
                    };
                }

                nProductInCart = storeFuncs.itemExistInCart();
            },
            /*
                show product details
            */
            productDetails: function (nProductIndexID) {

                storeFuncs.selectCurrentProduct(nProductIndexID);

                $domElements.modalContainer.html(
                    _templates.productsDetailsModal({
                        oCurrentProductData: oCurrentProductData,
                        fnMisc: fnMisc,
                        categoriesCollection: categoriesCollection
                    })
                );

                storeFuncs.updateAddToCartBtn();
                storeFuncs.openModal();
            },
            /*
                show shopping cart
            */
            showShoppingCart: function (oOptions) {

                $domElements.modalContainer.html(
                    _templates.shoppingCartModal({
                        cartProductsCollection: cartProductsCollection,
                        allProductsCollection: allProductsCollection,
                        configOptions: configOptions,
                        fnMisc: fnMisc,
                        generalVars: generalVars,
                        cartStats: cartStats
                    })
                );

                if (oOptions && oOptions.preventModelReLoad) {
                    return false;
                }

                storeFuncs.openModal();

                storeFuncs.updateAddToCartBtn();


                if (!generalVars.isStoreLoaded) {
                    storeFuncs.loadCategoryProducts('all');
                }
            },
            /*
                let the system know that you back from any of the modal functionality
                & it don't need to rearrange products of that particular category
            */
            backFromModal: function () {

                $domElements.mainContainer.removeClass('main-container-additions');

                if (generalVars.preventHashChange) {
                    generalVars.preventHashChange = false;
                    return false;
                }

                generalVars.preventHashChangedAction = true;

                if (generalVars.lastAccessedCategory == 'search') {
                    location.hash = "#/search";
                } else {
                    location.hash = "#/category/uid-" + generalVars.lastAccessedCategory;
                }
            },
            /*
                Update add to cart button based on the existence of that product with selected categories
            */
            updatedSelectedOption: function (e) {

                e.preventDefault();

                var $this = $(this),
                    sCurrentOptionSelected = $this.find('option:selected').val(),
                    sCurrentOptionSelectedId = $this.data('id');

                if (fnMisc.objectLength(oCurrentProductData.productOptions[sCurrentOptionSelectedId].optionValues) > 0) {
                    _.each(oCurrentProductData.productOptions[sCurrentOptionSelectedId].optionValues, function (productOptionValue) {

                        if (productOptionValue.value == sCurrentOptionSelected) {
                            selectedProductOptions[sCurrentOptionSelectedId] = {
                                value: productOptionValue.value,
                                name: productOptionValue.name,
                                optionTitle: oCurrentProductData.productOptions[sCurrentOptionSelectedId].title,
                            };
                        }
                    });
                }

                return storeFuncs.updateAddToCartBtn();
            },
            /*
                Grid add (or increment product quantity if already in cart) product to cart
            */
            addToCartGridItem: function (e) {
                e.preventDefault();

                if (!oCurrentProductData) {
                    return false;
                }

                storeFuncs.addToCart(e, parseInt($(e.target).parents('.popover').find('.item-product-qty').val()));
            },
            /*
                add (or increment product quantity if already in cart) product to cart
            */
            addToCart: function (e, requestedQty) {

                if (!requestedQty) {
                    requestedQty = parseInt($('.modal .item-product-qty').val());
                }

                if (e) {
                    e.preventDefault();
                }

                if (storeFuncs.itemExistInCart()) {

                    if (requestedQty && (cartProductsCollection[generalVars.nProductIndexInCart].qty != requestedQty)) {
                        cartProductsCollection[generalVars.nProductIndexInCart].qty = requestedQty
                    } else {
                        cartProductsCollection[generalVars.nProductIndexInCart].qty++;
                    }

                    storeFuncs.updateCart();
                    return storeFuncs.updateAddToCartBtn();

                }

                /*
                    Its not in the cart, lets add it.
                */
                cartProductsCollection.push({
                    index: oCurrentProductData.index,
                    options: _.extend({}, selectedProductOptions),
                    qty: (requestedQty && _.isNumber(requestedQty)) ? requestedQty : 1
                });

                storeFuncs.updateCart();
                return storeFuncs.updateAddToCartBtn();
            },
            /*
                Update Shopping cart
            */
            updateCart: function () {

                try {
                    cartStats.totalItems = 0;
                    cartStats.subTotal = 0;
                    cartStats.totalTaxes = 0;
                    cartStats.totalShippingCharges = 0;
                    /*
                        Store cart in storage, so on refresh of page we can get it again
                    */
                    $.jStorage.set(generalVars.cartStorageName, $.toJSON(cartProductsCollection));


                    for (var nCartItem in cartProductsCollection) {
                        var oCurrentCartItem = cartProductsCollection[nCartItem],
                            oCurrentProductItem = allProductsCollection[oCurrentCartItem.index],
                            totalAddonPriceForProduct = 0;

                        if (!oCurrentProductItem) {
                            cartProductsCollection = new Array();
                            break;
                        }

                        if (!_.isEmpty(oCurrentCartItem.options)) {
                            _.each(oCurrentCartItem.options, function (listItemOption, listItemOptionKey) {
                                var listOptionValueDetails = _.findWhere(oCurrentProductItem.productOptions[listItemOptionKey].optionValues, {
                                    value: listItemOption.value
                                });

                                if (listOptionValueDetails.addonPrice) {
                                    totalAddonPriceForProduct = totalAddonPriceForProduct + listOptionValueDetails.addonPrice;
                                }
                            });
                        };

                        if (oCurrentProductItem.additionalShippingCharge) {
                            cartStats.totalShippingCharges += oCurrentProductItem.calculateShipping(oCurrentCartItem.qty);
                        }

                        if (oCurrentProductItem.taxPercentage || configOptions.taxPercentage) {
                            cartStats.totalTaxes += oCurrentProductItem.calculateTax(totalAddonPriceForProduct, oCurrentCartItem.qty);
                        }

                        cartStats.totalItems += oCurrentCartItem.qty;
                        cartStats.subTotal += ((oCurrentProductItem.price + totalAddonPriceForProduct) * oCurrentCartItem.qty);
                    }

                    if (configOptions.shippingCharges) {
                        cartStats.totalShippingCharges += configOptions.shippingCharges;
                    }

                    if (generalVars.orderType !== 'delivery') {
                        cartStats.totalShippingCharges = 0;
                    }

                    cartStats.amountFormatted = fnMisc.fullFormatAmount(cartStats.subTotal);

                    generalVars.enableOrderBtn = ((cartProductsCollection.length > 0) && generalVars.orderType) ? true : false;

                    $domElements.shoppingCartBtnContainer.html(
                        _templates.shoppingCartBtn({
                            cartStats: cartStats
                        })
                    );

                } catch (err) {
                    cartProductsCollection = new Array();
                    $.jStorage.set(generalVars.cartStorageName, $.toJSON([]));
                    storeFuncs.updateCart();
                }

            },
            /*
                Update product qty from the cart
            */
            updateCartItemQty: function () {
                clearTimeout(generalVars.qtyUpdateTimeout);
                var $this = $(this),
                    nQtyValue = Math.ceil(new Number($this.val())),
                    nCartRowIndex = $this.data('cartrowindex');

                if (nQtyValue < 1) {
                    $this.val(1);
                    return false;
                }

                generalVars.qtyUpdateTimeout = setTimeout(function () {
                    cartProductsCollection[nCartRowIndex].qty = nQtyValue;
                    storeFuncs.updateCart();

                    storeFuncs.showShoppingCart({
                        preventModelReLoad: true
                    });
                }, 300);
            },
            /*
                Remove product from cart
            */
            removeCartItem: function (e) {
                var nCartRowIndex = $(this).data('cartrowindex');

                cartProductsCollection.splice(nCartRowIndex, 1);
                storeFuncs.updateCart();
                storeFuncs.showShoppingCart({
                    preventModelReLoad: true
                });
            },
            /*
                Update add to cart button to update
            */
            updateAddToCartBtn: function () {

                $domElements.addToCartBtnContainer = $('#addToCartBtnContainer');
                nProductInCart = storeFuncs.itemExistInCart();

                $('#addToCartBtnContainer').html(
                    _templates.addToCartBtn({
                        nProductInCart: nProductInCart
                    })
                );

                $('#productsContainer .item-product-qty, .modal .item-product-qty').val(nProductInCart ? nProductInCart : 1);
                $('#productsContainer .lw-popover-content .add-to-cart-btn-grid-item-save').text(nProductInCart ? 'Actualizar' : 'Agregar');

                return nProductInCart;
            },
            /*
                Check if the product already in cart with selected options
            */
            itemExistInCart: function () {

                generalVars.nProductIndexInCart = false;

                for (var nCartItem in cartProductsCollection) {
                    var oCurrentCartItem = cartProductsCollection[nCartItem];

                    if (oCurrentCartItem.index == oCurrentProductData.index) {

                        var matchedOptions = 0;

                        for (var optionItemKey in oCurrentCartItem.options) {

                            if (oCurrentCartItem.options[optionItemKey].value == selectedProductOptions[optionItemKey].value) {

                                matchedOptions++;
                            }

                        }

                        if (matchedOptions === fnMisc.objectLength(oCurrentCartItem.options)) {

                            generalVars.nProductIndexInCart = nCartItem;

                            return oCurrentCartItem.qty;

                            break;

                        }

                    }
                };

                return false;
            },
            /*
                Breadcrumb on product Mouseover
            */
            updateBreadCrumbOnOver: function () {
                var nMouseOveredProductIndexID = $(this).data('productindex'),
                    getMouseOveredProduct = allProductsCollection[nMouseOveredProductIndexID];
                $domElements.productsBreadcrumb.html(generalVars.parentCategoriesString + ((getMouseOveredProduct) ? '  <li class="breadcrumb-item">' + getMouseOveredProduct.name + '</li>' : '</li>'));
            },
            /*
                Update product breadcrumb values
            */
            updateBreadCrumb: function (oProductCategory, oProduct) {

                var parentCategoriesString = generalVars.initialBreadcrumb;

                if (oProductCategory == 'all') {
                    $domElements.productsBreadcrumb.html(parentCategoriesString);
                } else {

                    var parentCategories = storeFuncs.getParentCategories(oProductCategory.index, null, true);

                    _.each(parentCategories.reverse(), function (parentCategoryItem) {
                        parentCategoriesString += '<li class="breadcrumb-item"><a data-categoryindex="all" href="#/category/uid-' +
                            parentCategoryItem.index + '" class="category-link-' +
                            parentCategoryItem.index + ' category-link">' +
                            parentCategoryItem.name + '</a></li>';
                    });
                }

                generalVars.parentCategoriesString = parentCategoriesString;
                $domElements.productsBreadcrumb.html(parentCategoriesString);
            },
            /*
                Go to submit order form
            */
            proceedToOrderByWhatsApp: function (e) {
                e.preventDefault();

                generalVars.preventHashChange = true;

                if (!generalVars.enableOrderBtn) {
                    return false;
                } else {
                    storeFuncs.closeAllModals();

                    clearTimeout(generalVars.showSubmitOrderTimeout);
                    generalVars.showSubmitOrderTimeout = setTimeout(function () {

                        $domElements.modalContainer.html(
                            _templates.submitOrderFormModal({
                                configOptions: configOptions
                            })
                        );

                        $domElements.modalContainer.find('.lw-delivery-fields').hide();
                        $domElements.modalContainer.find('.lw-delivery-fields .required').removeAttr('required');
                        $domElements.modalContainer.find('.lw-delivery-field-' + generalVars.orderType).show();
                        $domElements.modalContainer.find('.lw-delivery-field-' + generalVars.orderType).attr('required', 'required');

                        storeFuncs.openModal();

                        $('#submitOrderForm').validate();
                        $('.required').on('keyup change', storeFuncs.validateSubmitOrderForm);

                    }, 500);
                };
            },
            /*
                Submit Order
            */
            submitOrder: function (e) {
                e.preventDefault();

                if (!generalVars.enableOrderBtn) {
                    return false;
                } else if (storeFuncs.validateSubmitOrderForm()) {

                    $('.lw-errors-container').addClass('hidden').find('.lw-error-*').addClass('hidden');

                    generalVars.enableOrderBtn = false;

                    var orderText = 'https://api.whatsapp.com/send?phone=' + configOptions['checkoutMethods']['orderByWhatsApp']['mobileNumber'] + '&text=';

                    orderText += encodeURIComponent(_templates.whatsAppOrderTemplate({
                        cartProductsCollection: cartProductsCollection,
                        allProductsCollection: allProductsCollection,
                        configOptions: configOptions,
                        fnMisc: fnMisc,
                        generalVars: generalVars,
                        cartStats: cartStats,
                        orderId: fnMisc.uniqueIdGeneration(),
                        selectedOrderType: configOptions['checkoutMethods']['orderByWhatsApp']['orderTypes'][generalVars.orderType]['title'],
                        formDetails: fnMisc.queryToObject($('#submitOrderForm').serialize())
                    }));
                    storeFuncs.onOrderSubmitted();
                    window.location.href = orderText;
                    return;

                } else {
                    $('.error').first().focus();
                };

            },

            onOrderSubmitted: function () {

                var customerMailMessage = '<br/> Tu pedido ha sido preparado, envíalo por WhatsApp!!';

                $('.order-page-header').html("Pedido preparado por WhatsApp");
                $('.order-page-body').html("Gracias por tu pedido, " + customerMailMessage);

                $('#backToCartBtn, #submitOrderBtn').hide();
                $('.order-page-close-btn').show();

                cartProductsCollection = new Array();
                storeFuncs.updateCart();
            },
            /*
                Check if the form is Validated or not
            */
            validateSubmitOrderForm: function () {

                var isSubmitFormValid = $('#submitOrderForm').valid();

                if (isSubmitFormValid) {
                    $('#submitOrderBtn').removeAttr('disabled').removeClass('disabled');
                } else {
                    $('#submitOrderBtn').attr('disabled', 'disabled').addClass('disabled', 'disabled');
                }

                return isSubmitFormValid;

            },
            /*
                User back from Order submit form Modal to Cart
            */
            backToCartFromSubmitForm: function (e) {

                e.preventDefault();
                storeFuncs.closeAllModals();

                generalVars.preventHashChange = true;

                clearTimeout(generalVars.showSubmitOrderTimeout);
                generalVars.showSubmitOrderTimeout = setTimeout(function () {

                    storeFuncs.showShoppingCart({
                        preventModelReLoad: true
                    });
                    storeFuncs.openModal();

                }, 500);
            },
            /*
                Checkout
            */
            processCheckout: function (e) {

                e.preventDefault();

                if (!generalVars.enableOrderBtn) {
                    return false;
                }

                var $thisButton = $(this);

                if ($thisButton.data('method') === 'orderByWhatsApp') {
                    storeFuncs.proceedToOrderByWhatsApp(e);
                } else {
                    console.log($thisButton.data('method'));
                }

            },
            /*
                Close all opened Modals
            */
            closeAllModals: function () {
                $domElements.modalCommon.modal('hide');
                $('.modal-backdrop').remove();
            },
            /*
                Open Modal
            */
            openModal: function () {
                storeFuncs.closeAllModals();
                $domElements.modalCommon.modal('show');
                $domElements.modalCommon.modal('handleUpdate');
            },
            /*
                Load category based on hash value
            */
            categoryCalled: function (oGetURLData) {

                if (!oGetURLData.u) {
                    oGetURLData.u = 'all';
                }

                oGetURLData.u = (categoriesCollection[oGetURLData.u]) ? oGetURLData.u : 'all';

                storeFuncs.loadCategoryProducts(oGetURLData.u);
            },
            /*
                Load product details based on hash value
            */
            productCalled: function (oGetURLData) {

                if (oGetURLData.u) {
                    storeFuncs.productDetails(oGetURLData.u);

                    $domElements.mainContainer.addClass('main-container-additions');

                    if (!allProductsCollection[oGetURLData.u]) {

                        storeFuncs.loadCategoryProducts('all');
                        return false;
                    }

                    var nCategoryIndex = allProductsCollection[oGetURLData.u].categoryIndex

                    if (!generalVars.isStoreLoaded) {
                        storeFuncs.loadCategoryProducts(nCategoryIndex);
                    }

                } else {

                    storeFuncs.loadCategoryProducts('all');
                }
            },
            /*
                on action gets all completed
            */
            onAllComplete: function () {

                storeFuncs.closeAllModals();

                var oURLData = fnMisc.dataFromURL();

                if (oURLData.hasOwnProperty('category')) {

                    if (generalVars.preventHashChangedAction) {
                        generalVars.preventHashChangedAction = false;
                        return false;
                    }

                    storeFuncs.categoryCalled(oURLData);

                } else if (oURLData.hasOwnProperty('search')) {

                    if (generalVars.preventHashChangedAction) {
                        generalVars.preventHashChangedAction = false;
                        return false;
                    }

                    storeFuncs.searchProduct();

                } else if (oURLData.hasOwnProperty('product')) {

                    storeFuncs.productCalled(oURLData);

                } else if (oURLData.hasOwnProperty('shopping-cart')) {

                    storeFuncs.showShoppingCart();

                } else {
                    storeFuncs.loadCategoryProducts('all');
                }

                if (!generalVars.isStoreLoaded) {
                    generalVars.isStoreLoaded = true;
                }
            }
        };


        $(window).on('hashchange', function () {
            generalVars.hashChanged = true;
            storeFuncs.onAllComplete();
        });

        $(window).on('resize', fnMisc.resizeNPosition);

        $('body').on('click', '.lw-load-more-content', storeFuncs.loadMoreItems);

        $domElements.categoriesList.on('click', '.category-link', storeFuncs.categoryLinkAction);

        $domElements.productsContainer.on('click', '.add-to-cart-btn-grid-item-save', storeFuncs.addToCartGridItem);

        $domElements.modalContainer.on('click', '.lw-hash-link-action', function (e) {
            e.preventDefault();
            var hashlink = $(this).attr('href');
            _.delay(function () {
                location.hash = hashlink;
            }, 500);
        });

        $domElements.modalContainer.on('click', '.add-to-cart-btn', storeFuncs.addToCart);

        $domElements.searchInput.on('keyup', storeFuncs.onSearch);

        $domElements.clearSearchBtn.on('click',
            function () {
                storeFuncs.clearSearchResult(false);
            });

        $domElements.productsContainer.on('change',
            '.option-selector', storeFuncs.updatedSelectedOption);

        $domElements.modalContainer.on('change',
            '.option-selector', storeFuncs.updatedSelectedOption);

        $domElements.modalContainer.on('blur change',
            'input.cart-product-qty', storeFuncs.updateCartItemQty);

        $domElements.modalContainer.on('click',
            '.delete-product-from-cart', storeFuncs.removeCartItem);

        $domElements.modalContainer.on('click',
            '.lw-checkout-button', storeFuncs.processCheckout);

        $domElements.modalContainer.on('click',
            '#checkoutSubmitOrderBtn', storeFuncs.proceedToOrderByWhatsApp);

        $domElements.modalContainer.on('click',
            '#submitOrderBtn', storeFuncs.submitOrder);

        $domElements.modalContainer.on('click',
            '#backToCartBtn', storeFuncs.backToCartFromSubmitForm);

        $domElements.modalContainer.on('change',
            '#orderTypeSelection',
            function () {
                // var selectedOrderType = $(this).val();
                generalVars.orderType = $(this).val();
                storeFuncs.updateCart();
                storeFuncs.showShoppingCart({
                    preventModelReLoad: true
                });
            });

        $domElements.goToTop.on('click', fnMisc.goToTop);

        $domElements.productsContainer.on('mouseover',
            '.product-item', storeFuncs.updateBreadCrumbOnOver);
        $domElements.modalCommon.on('hidden hidden.bs.modal', storeFuncs.backFromModal);


        $(document).on('click', '.lw-number-spinner button', function () {
            var btn = $(this),
                oldValue = btn.closest('.lw-number-spinner').find('input').val().trim(),
                newVal = 0;

            if (btn.attr('data-dir') == 'up') {
                newVal = parseInt(oldValue) + 1;
            } else {
                if (oldValue > 1) {
                    newVal = parseInt(oldValue) - 1;
                } else {
                    newVal = 1;
                }
            }
            btn.closest('.lw-number-spinner').find('input').val(newVal);
        });


        // When the user scrolls down 20px from the top of the document, show the button
        window.onscroll = function () {
            scrollFunction()
        };

        function scrollFunction() {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                // mybutton.style.display = "block";
                $('#lwGotoTop').fadeIn();
            } else {
                // mybutton.style.display = "none";
                $('#lwGotoTop').fadeOut();
            }
        }

        scrollFunction();

        $('body').on('click', '.lw-sidebar-toggle-btn, .lw-sidebar-overlay', function (e) {
            e.preventDefault();
            $('body').toggleClass('lw-sidebar-opened');
        });

    };

})(jQuery, window);
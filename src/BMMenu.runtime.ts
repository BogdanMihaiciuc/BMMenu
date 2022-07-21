/// <reference path="../../BMCoreUI/build/ui/BMCoreUI/BMCoreUI.d.ts"/>

import { ThingworxRuntimeWidget, TWService, TWProperty } from 'typescriptwebpacksupport/widgetruntimesupport'

/**
 * An enum containing the kinds of data sources that this widget can use.
 */
export enum BMMenuWidgetDataSourceKind {
    /**
     * Represents that the data source is a state definition.
     */
    State = 'state',

    /**
     * Represents that the data source is an infotable.
     */
    Infotable = 'infotable'
}

/**
 * An enum containing the kinds of targets that this widget can use.
 * The target is the area of the viewport that can be used to trigger this menu.
 */
export enum BMMenuWidgetTargetKind {

    /**
     * Represents that the target is this widget.
     */
    ThisWidget = 'thisWidget',

    /**
     * Represents that the target is a different widget within the mashup.
     */
    Reference = 'reference'
}


/**
 * An enum that contains that describe how a menu should display.
 */
 enum BMMenuDisplayMode {
    /**
     * Indicates that the kind of menu is determined by the
     * kind of event that triggers it.
     */
    Auto = 'auto',

    /**
     * Indicates that the menu will always appear as a desktop menu.
     */
    Mouse = 'mouse',

    /**
     * Indicates that the menu will always appear as a touch menu.
     */
    Touch = 'touch'
}

@ThingworxRuntimeWidget
export class BMMenuWidget extends TWRuntimeWidget {

    /**
     * The data source kind to use.
     */
    @TWProperty ('dataSourceKind') dataSourceKind: BMMenuWidgetDataSourceKind;

    /**
     * Represents the complete menu definition when the data source is a state definition.
     */
    @TWProperty ('menuDefinition') menuDefinition: string;

    /**
     * Represents the infotable field to use as the name when the data source is an infotable.
     */
    @TWProperty ('nameField') nameField: string;

    /**
     * Represents the infotable field to use as the submenu when the data source is an infotable.
     */
    @TWProperty ('submenuField') submenuField: string;

    /**
     * The field that represents a CSS class that should be added to the menu item.
     */
    @TWProperty ('classField') classField: string;

    /**
     * Creates and returns a menu initialized with the values in the specified infotable.
     * @param menuInfotable         The infotable from which to create a menu.
     * @returns                     A menu, or `undefined` if a menu could not be created.
     *                              from the specified infotable.
     */
    private _menuWithInfotable(menuInfotable: TWInfotable | undefined): BMMenu | undefined {
        // If the infotable is blank return undefined
        if (!menuInfotable) return undefined;

        // Recreate the menu whenever this infotable gets updated
        const items = menuInfotable.rows.map(e => {
            let submenu: BMMenu | undefined;
            let CSSClass: string | undefined;
            
            // If the item has a submenu, create a menu for it
            if (e[this.submenuField]) {
                submenu = this._menuWithInfotable(e[this.submenuField]);
            }

            // If the item has a custom class, apply it
            CSSClass = e[this.classField];

            const menuItem = BMMenuItem.menuItemWithName(e[this.nameField], {submenu});
            menuItem.CSSClass = CSSClass;
            return menuItem;
        });

        // Return undefined if the menu would be blacnk
        if (!items.length) return undefined;

        // Create and configure the menu
        const menu = BMMenu.menuWithItems(items);
        menu.CSSClass = this.menuClass;
        menu.delegate = this;

        return menu;
    }

    /**
     * The menu infotable.
     */
    @TWProperty('menu') 
    set menuInfotable(menuInfotable: TWInfotable) {
        this.menu = this._menuWithInfotable(menuInfotable);
    }

    /**
     * The kind of target.
     */
    @TWProperty ('targetKind') targetKind: BMMenuWidgetTargetKind;

    /**
     * The target widget name, if the target kind is a widget reference.
     */
    @TWProperty ('targetWidget') targetWidgetReference: string;

    @TWProperty ('selectedMenuItem') selectedMenuItem: string;

    /**
     * An optional list of custom classes to add to the menu DOM node.
     */
    @TWProperty ('menuClass') set menuClass(CSSClass: string) {
        if (this.menu) this.menu.CSSClass = CSSClass;
    }

    /**
     * Controls whether the menu appears as a desktop menu or a touch menu.
     */
    @TWProperty ('displayMode') displayMode?: BMMenuDisplayMode;

    /**
     * The target widget, if the target kind is a widget reference and the widget could be found.
     */
    targetWidget?: TWWidget;


    /**
     * The menu instance.
     */
    menu?: BMMenu;

    /**
     * The context menu handler to attach to widgets.
     */
    contextMenuHandler: (event?: MouseEvent | TouchEvent) => void;

    renderHtml(): string {
        return '<div class="widget-content BMMenuWidget"></div>';
    };

    async afterRender(): Promise<void> {
        if (this.dataSourceKind == BMMenuWidgetDataSourceKind.State) {
            const items = [];

            // When data source is set to a state definition, extract the states and build the menu items
            const stateDefinition = TW.getStateDefinition(this.menuDefinition);
            const states = stateDefinition && stateDefinition.content && stateDefinition.content.stateDefinitions;

            if (!states || !states.length) return;

            for (const state of states) {
                if (state.displayString) items.push(BMMenuItem.menuItemWithName(state.displayString));
            }

            // Also initialize the menu
            this.menu = BMMenu.menuWithItems(items);
            this.menu.CSSClass = this.menuClass;

            this.menu.delegate = this;
        }

        /**
         * Tests whether the specified event is a touch event, for the purposes of
         * determining if a menu should open from the target widget or the event's location.
         * @param event     The event to test.
         * @returns         `true` if the event is a `TouchEvent`, false otherwise.
         */
        function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent {
            return event.type == 'touchstart';
        }

        this.contextMenuHandler = event => {
            if (!this.targetWidget) return;

            // Use the display mode to determine which kind of menu to display
            const displayMode = this.displayMode || BMMenuDisplayMode.Auto;

            // Prevent the regular context menu from appearing
            if (event) {
                event.preventDefault();
            }

            if (
                ((event.type != 'contextmenu') && displayMode == BMMenuDisplayMode.Auto) || 
                displayMode == BMMenuDisplayMode.Touch
            ) {
                // Show a touch menu if originating from a touch event and the display mode is auto
                // or if the display mode is set to touch
                return this.menu.openFromNode(this.targetWidget.jqElement[0]);
            }

            const frame = BMRectMakeWithNodeFrame(this.targetWidget.jqElement[0]);
            const point = BMPointMake();

            if (event) {
                // Get the event's coordinates based on the kind of event
                if (isTouchEvent(event)) {
                    point.x = event.changedTouches[0].clientX;
                    point.y = event.changedTouches[0].clientY;
                }
                else {
                    point.x = event.clientX;
                    point.y = event.clientY;
                }
            }
            else {
                // If an event isn't available (e.g. due to being triggered programatically)
                // use the anchor's frame
                point.x = frame.bottom;
                point.y = frame.bottom;
            }

            if (this.menu) {
                // If the menu didn't open as a touch menu, it should open as a mouse menu
                this.menu.openAtPoint(point);
            }
        }

        // For infotable data sources, await for the value to be initialized

        // If the target kind is a widget reference, wait for the mashup to finish loading, then attempt to find that widget
        if (this.targetKind == BMMenuWidgetTargetKind.Reference) {
            const widgetName = this.targetWidgetReference;
            this.boundingBox[0].style.display = 'none';

            await 0;

            this.targetWidget = this.findWidgetNamed(widgetName, {inWidget: this.mashup.rootWidget});
        }
        else {
            this.targetWidget = this;
        }

        if (this.targetWidget) {
            // Add a context menu handler, if right click triggering is enabled
            if (this.getProperty('triggerOnRightClick', YES)) {
                this.targetWidget.jqElement[0].addEventListener('contextmenu', this.contextMenuHandler);
            }

            // The touch identifier tracked to identify long taps
            let touchIdentifier: number | undefined;

            // A timeout used to trigger the long tap
            let timeout: number | undefined;

            // The starting position of the touch event sequence
            let originalPosition = BMPointMake();

            // Starts the timeout that triggers the long tap
            const beginTimeout = (event: TouchEvent | MouseEvent) => {
                timeout = window.setTimeout(() => {
                    timeout = undefined;
                    touchIdentifier = undefined;

                    event.preventDefault();

                    this.contextMenuHandler(event);
                }, _BMCollectionViewLongClickDelay);
            }

            // Cancels the long tap timeout, preventing the event from occurring
            const cancelTimeout = () => {
                window.clearTimeout(timeout);
                timeout = undefined;
                touchIdentifier = undefined;
            }

            // Verifies if the pointer moved too much and cancels the timeout if it did
            const verifyPointerMovement = (point: BMPoint) => {
                if (Math.abs(point.x - originalPosition.x) > _BMCollectionViewClickSlopeThreshold ||
		    	    Math.abs(point.y - originalPosition.y) > _BMCollectionViewClickSlopeThreshold) {
                    // If the touch pointer moves too much, cancel the long tap
				    cancelTimeout();
                }
            }

            const targetNode = this.targetWidget.jqElement[0];

            // Set up the touch handlers allowing menus to be opened on touch devices
            targetNode.addEventListener('touchstart', event => {
                // Only track a single touch
                if (touchIdentifier) return;

                // Use the first touch point to track this long tap
                touchIdentifier = event.changedTouches[0].identifier;

                // Set the original position of the event to test if the touch pointer
                // moves too much to trigger the long tap
                originalPosition.x = event.touches[0].pageX || 0;
                originalPosition.y = event.touches[0].pageY || 0;

                // Set a timeout to trigger the long tap after a sufficient delay, as long as the
                // touch pointer doesn't move significantly
                beginTimeout(event);
            });

            targetNode.addEventListener('touchmove', event => {
                // Don't process if there is no tracked touch
                if (!touchIdentifier) return;

                // Ensure that the tracked touch did change
			    let i = 0;
                let x: number, y: number;
			    for (; i < event.changedTouches.length; i++) { 
				    if (event.changedTouches[i].identifier == touchIdentifier) {
					    x = event.changedTouches[i].pageX;
					    y = event.changedTouches[i].pageY;
					    break;
				    }
				} 
				
			    // If the tracked touch did not change, ignore this touchmove event
			    if (i == event.changedTouches.length) return;

                // Verify if the pointer exceeded the slope threshold
                verifyPointerMovement(BMPointMake(x, y));
            });

            let touchCancelAndEndHandler = (event: TouchEvent) => {
                // Don't process if there is no tracked touch
                if (!touchIdentifier) return;

                // Ensure that the tracked touch did change
			    let i = 0;
                let x: number, y: number;
			    for (; i < event.changedTouches.length; i++) { 
				    if (event.changedTouches[i].identifier == touchIdentifier) {
					    x = event.changedTouches[i].pageX;
					    y = event.changedTouches[i].pageY;
					    break;
				    }
				} 
				
			    // If the tracked touch did not change, ignore this touchcancel or touchend event
			    if (i == event.changedTouches.length) return;

                // Otherwise prevent the long tap from triggering
                cancelTimeout();
            };

            targetNode.addEventListener('touchcancel', touchCancelAndEndHandler);
            targetNode.addEventListener('touchend', touchCancelAndEndHandler);

            // If long click is enabled, set up handlers to track it in a similar manner to touch events
            if (this.getProperty('triggerOnLongClick', NO)) {
                targetNode.addEventListener('mousedown', event => {
                    // Set the original position of the event to test if the touch pointer
                    // moves too much to trigger the long tap
                    originalPosition.x = event.clientX || 0;
                    originalPosition.y = event.clientY || 0;

                    // Only handle left clicks
                    if (event.button != 0) return;

                    beginTimeout(event);

                    // Attach a mousemove listener to verify if the movement limit is exceeded
                    const mouseMoveListener = (event: MouseEvent) => {
                        verifyPointerMovement(BMPointMake(event.clientX, event.clientY));
                    }

                    window.addEventListener('mousemove', mouseMoveListener);
                    window.addEventListener('mouseup', event => {
                        // When the mouse button is released, cancel the long click timeout if it hasn't triggered
                        cancelTimeout();
                        window.removeEventListener('mousemove', mouseMoveListener);
                    }, {once: YES});
                });
            }
        }
    }

    /**
     * Finds the widget with the given name, starting from the given widget.
     * This method will recursively look through the child widgets of the specified widget.
     * @param named         The name of the widget.
     * @param inWidget      The widget to search through.
     */ 
    private findWidgetNamed(named, {inWidget: widget}: {inWidget: TWRuntimeWidget}) {
        if (widget.getProperty('DisplayName') == named) return widget;

        let result: TWRuntimeWidget | undefined;
        for (const child of widget.getWidgets()) {
            result = this.findWidgetNamed(named, {inWidget: child});
            if (result) return result;
        }
    }

    menuDidSelectItem(menu: BMMenu, item: BMMenuItem) {
        this.selectedMenuItem = item.name;
        this.jqElement.triggerHandler('menuDidSelectItem');
        this.jqElement.triggerHandler('Menu:' + item.name);
    }

    @TWService('ShowMenu')
    showMenu() {
        this.contextMenuHandler();
    }

    beforeDestroy?(): void {
        // resetting current widget
        if (this.targetWidget) this.targetWidget.jqElement[0].removeEventListener('contextmenu', this.contextMenuHandler);
    }
}
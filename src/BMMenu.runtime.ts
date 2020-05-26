/// <reference path="../../BMCoreUI/build/ui/BMCoreUI/BMCoreUI.d.ts"/>

import { ThingworxRuntimeWidget, TWService, TWProperty } from 'typescriptwebpacksupport'

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
     * The menu infotable.
     */
    @TWProperty('menu') 
    set menuInfotable(menuInfotable: TWInfotable) {
        this.menu = undefined;

        // Clear out the menu if the infotable is blank
        if (!menuInfotable) return;

        // Recreate the menu whenever this infotable gets updated
        const items = menuInfotable.rows.map(e => BMMenuItem.menuItemWithName(e[this.nameField]));

        if (!items.length) return;

        this.menu = BMMenu.menuWithItems(items);
        this.menu.CSSClass = this.menuClass;
        this.menu.delegate = this;
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
    contextMenuHandler: (event?: MouseEvent) => void;

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

        this.contextMenuHandler = event => {
            if (!this.targetWidget) return;

            if (event.type == 'touchstart') {
                return this.menu.openFromNode(this.targetWidget.jqElement[0]);
            }

            const frame = BMRectMakeWithNodeFrame(this.targetWidget.jqElement[0]);
            const point = BMPointMake();

            if (event) {
                event.preventDefault();
                point.x = event.pageX;
                point.y = event.pageY;
            }
            else {
                point.x = frame.bottom;
                point.y = frame.bottom;
            }

            if (this.menu) {
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
            this.targetWidget.jqElement[0].addEventListener('contextmenu', this.contextMenuHandler);
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
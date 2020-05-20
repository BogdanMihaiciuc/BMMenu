// automatically import the css file
import { ThingworxComposerWidget, TWWidgetDefinition, description, autoResizable, property, defaultValue, bindingTarget, baseTypeInfotableProperty, event, service, nonEditable, bindingSource, hidden } from 'typescriptwebpacksupport';

@description('Displays a popup menu when the user right-clicks on a region or a different widget.')
@TWWidgetDefinition('Popup Menu', autoResizable)
class BMMenuWidget extends TWComposerWidget {

    @property ('NUMBER', defaultValue(90)) Width: number;

    @property ('NUMBER', defaultValue(30)) Height: number;

    @description('The data source kind to use.')
    @property ('STRING', defaultValue('state')) dataSourceKind: string;

    @description('When the data source is a state definition, this represents the menu to use for this popup menu.')
    @property ('STATEDEFINITION') menuDefinition: string;

    @description('When the data source is an infotable, this represents the menu to use for this popup menu.')
    @property ('INFOTABLE', bindingTarget) menu: any;

    @description('The field that represents the name of the menu entry.')
    @property ('FIELDNAME', baseTypeInfotableProperty('menu')) nameField: string;

    @description('Controls what area triggers the popup menu on right click.')
    @property ('STRING', defaultValue('thisWidget')) targetKind: string;

    @description('When the target is set to another widget, this represents the display name of the widget on which right-clicking will trigger the popup menu.')
    @property ('STRING') targetWidget: string;

    @description('Triggered when the user clicks on a menu item.')
    @event menuDidSelectItem;

    @description('Represents the name of the menu item that was clicked')
    @property ('STRING', nonEditable, bindingSource) selectedMenuItem;

    @property ('STRING', defaultValue('{}'), hidden) private _menuDefinition;

    @description('Should be invoked to show the menu. It will be shown from the bottom-right corner of its target.')
    @service showMenu;

    widgetIconUrl(): string {
        return require('./images/icon.png');
    }

    widgetProperties(): TWWidgetProperties {
        require("./styles/ide.css");
        const props = super.widgetProperties();

        props.properties.dataSourceKind.selectOptions = [{value: 'state', text: 'State Definition'}, {value: 'infotable', text: 'Infotable'}];
        props.properties.targetKind.selectOptions = [{value: 'thisWidget', text: 'This Widget'}, {value: 'reference', text: 'Other Widget'}];

        return props;
    }

    renderHtml(): string {
        return '<div class="widget-content BMMenu">Menu: Invisible at runtime</div>';
    };

    afterSetProperty(key: string, value: any): any {
        if (key == 'menuDefinition') {
            this.menuDefinitionDidChange();
        }
    }

    afterLoad() {
		var properties = this.allWidgetProperties().properties;
		
		// Retrieve the menu definition and generate the events for that menu
		var menuDefinition = JSON.parse(this.getProperty('_menuDefinition'));
		for (var i = 0; i < menuDefinition.length; i++) {
			properties['Menu:' + menuDefinition[i]] = <any>{
				isBaseProperty: false,
				name: 'Menu:' + menuDefinition[i],
				type: 'event',
				isVisible: true,
				description: 'Triggered when selecting the ' + menuDefinition[i] + ' menu entry on a cell.',
				_BMCategories: ['all', 'menu']
			};
		}
		
		// Update the properties UI
		this.updatedProperties();
    }

    /**
     * Invoked upon the menu definition changing.
     */
    menuDefinitionDidChange() {
        const properties = this.allWidgetProperties().properties;

        const definition = TW.getStateDefinition(this.getProperty('menuDefinition'));

        const oldDefinitions: string[] = JSON.parse(this.getProperty('_menuDefinition') || '[]');

        for (const definition of oldDefinitions) {
            delete properties['Menu:' + definition];
        }

        let stateDefinition: any;
		
		if (!(stateDefinition = (definition && definition.content && definition.content.stateDefinitions))) {
			// If the state definition is undefined, there is nothing else to do
			return;
        }
		
		// Extract the state names from the menu definition
        var menuDefinition: any[] = [];
        for (const definition of stateDefinition) {
			if (definition.displayString) menuDefinition.push(definition.displayString);
        }

		this.setProperty('_menuDefinition', JSON.stringify(menuDefinition));
		
		// Append the new properties to this widget
		for (var i = 0; i < menuDefinition.length; i++) {
			properties['Menu:' + menuDefinition[i]] = {
				isBaseProperty: false,
				name: 'Menu:' + menuDefinition[i],
				type: 'event',
				isVisible: true,
				description: 'Triggered when selecting the ' + menuDefinition[i] + ' menu entry.',
				_BMCategories: ['all', 'menu']
			} as any;
		}
	
		// Update the properties UI
		this.updatedProperties();
    }

    afterRender(): void {
    }

    beforeDestroy(): void {
    }

}
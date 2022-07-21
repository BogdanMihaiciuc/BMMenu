# 2.9.0

This widget now has a proper icon and an updated appearance in the composer that matches the other Core UI controllers.

Adds a new `submenuField` property that can be used to select the infotable field that represents the submenu for a menu item. The value of the submenu field must be an infotable with the same data shape as the base data infotable.

Adds a new `classField` property that can be used to add custom classes to menu items.

Adds a new `displayMode` property that can be used to control whether the menu appears as a desktop menu or a touch menu.

Adds a new `triggerOnRightClick` property that can be used to disable right clicks from triggering the menu.

Adds a new `triggerOnLongClick` property that can be used to enable triggering the menu via long clicks. Menus opened via long clicks will open as touch menus when display mode is set to automatic.

Resolves an issue where menus could not be opened on touch devices.

Resolves an issue where fields could not be selected when using an infotable based menu.

# 2.6.7

Updated dependecies.

# 2.6

Added support for specifying custom classes for the menu DOM node.

# 2.6 Beta 7

Added support for specifying custom classes for the menu DOM node.

# 1.0.1

Resolves an issue that caused the menu to not work appropriately with state definition menus.
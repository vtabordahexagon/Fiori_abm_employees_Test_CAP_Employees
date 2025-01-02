sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"   //agregamos la biblioteca JSONModel (para crear los modelos luego)
], (Controller,JSONModel) => {
    "use strict";

    return Controller.extend("fioriabmempleados.controller.App", {
        onInit() {
            //definimos la vista INICIAL de la APP como "OneColumn" (propiedad de Flexible Column Layout)
            var oViewModel=new JSONModel({
                showFooter:false,
                editable:false,
                editableEmployee:false,
                editableEmailsTable:false,
                editablePhonesTable:false,
                visible:false,
                visibleSaveEmailsEdit:false,
                visibleSavePhonesEdit:false
            });
            //aca le asignamos el modelo a la vista y se le llama con este nombre "appView"
            this.getView().setModel(oViewModel, "appView")
        }
    });
});
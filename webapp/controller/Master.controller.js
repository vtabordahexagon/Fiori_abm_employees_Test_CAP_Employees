sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "fioriabmempleados/model/formatter",
    ],
    function (Controller, JSONModel, Filter, FilterOperator, formatter) {
        "use strict";

        return Controller.extend("fioriabmempleados.controller.Master", {
            formatter: formatter,

            onInit: function () {
                this.oView = this.getView();
                this.oRouter = this.getOwnerComponent().getRouter();
                this.oModel = this.oView.getModel("oEmployeesData");
                this.aFilters = [];
                this.oRouter.getRoute("master").attachPatternMatched(this.onRouteMatched, this);
            },

            onRouteMatched: function () {
                this._bindTableItems();
            },
            _bindTableItems: function (sFilter) {
                var oTable = this.byId("EmployeesTable");
                if (oTable) {
                    var oTemplate = this.byId("tableTemplate");
                    oTable.bindAggregation("items", {
                        path: "oEmployeesData>/Employees",
                        template: oTemplate,
                        templateShareable: true,
                        parameters: {
                            $filter: sFilter,
                            $expand: "phones,emails",
                            $$updateGroupId: "myGroupId"
                        },
                    });
                } else {
                    console.error("Table not found");
                }
            },

            onSearch: function (oEvent) {
                var aFilter = [];
                var oModel = this.getView().getModel("oEmployeesData");

                var sFilter1 = this.getView().byId("FirstNameInput").getValue();
                var sFilter2 = this.getView().byId("LastNameInput").getValue();
                var sFilter3 = this.getView().byId("PositionInput").getValue();

                if (sFilter1) { aFilter.push(new Filter("firstName", FilterOperator.Contains, sFilter1)); }
                if (sFilter2) { aFilter.push(new Filter("lastName", FilterOperator.Contains, sFilter2)); }
                if (sFilter3) { aFilter.push(new Filter("position", FilterOperator.Contains, sFilter3)); }

                var oTable = this.getView().byId("EmployeesTable");
                var oBinding = oTable.getBinding("items");
                oBinding.filter(aFilter);
            },

            //ABM
            onCreatePress: function () {
                if (!this._oNewEmployeeDialog) {
                    this._oNewEmployeeDialog = sap.ui.xmlfragment("fioriabmempleados.view.fragments.NewEmployee", this);
                    this.getView().addDependent(this._oNewEmployeeDialog);
                    //aqui le seteamos el modelo, pero no funciona del todo (INVESTIGAR)
                    //   this._oNewEmployeeDialog.setModel(this.oModel, "oEmployeesData");
                }
                this._oNewEmployeeDialog.open();
            },
            onPostNewEmployee: async function () {
                //Le colocamos el modelo a utilizar (ya que el seteo no funcionó, lo hacemos desde aquí)
                var oModel = this.getView().getModel("oEmployeesData");
                var sFirstName = sap.ui.getCore().byId("newFirstName").getValue();
                var sLastName = sap.ui.getCore().byId("newLastName").getValue();
                var sBirthDate = sap.ui.getCore().byId("newBirthDate").getDateValue();
                var sHireDate = sap.ui.getCore().byId("newHireDate").getDateValue();
                var sPosition = sap.ui.getCore().byId("newPosition").getValue();

                // Formatear las fechas correctamente
                var sFormattedHireDate = sHireDate.toISOString().split('T')[0];
                var sFormattedBirthDate = sHireDate.toISOString().split('T')[0];

                let oEmployeeBindList = oModel.bindList("/Employees");
                await oEmployeeBindList.create({
                    firstName: sFirstName,
                    lastName: sLastName,
                    dateOfBirth: sFormattedBirthDate,
                    hireDate: sFormattedHireDate,
                    position: sPosition
                });

                this._oNewEmployeeDialog.close();
                this.refreshModel();
            },
            onCancelNewEmployee: function () {
                this._oNewEmployeeDialog.close();
            },

            onDeletePress: async function (oEvent) {
                var oItem = oEvent.getSource().getParent();
                var oCtx = oItem.getBindingContext("oEmployeesData");
                var sEmployeeID = oCtx.getProperty("employeeID");

                // Verificar que this.oModel esté definido
                if (!this.oModel) {
                    this.oModel = this.getView().getModel("oEmployeesData");
                }

                // Eliminar los correos electrónicos asociados
                let oEmailBindList = this.oModel.bindList("/Emails", undefined, undefined, new Filter("employeeID_employeeID", FilterOperator.EQ, sEmployeeID));
                let aEmailContexts = await oEmailBindList.requestContexts();
                for (let oEmailContext of aEmailContexts) {
                    await oEmailContext.delete();
                }

                // Eliminar los teléfonos asociados
                let oPhoneBindList = this.oModel.bindList("/Phones", undefined, undefined, new Filter("employeeID_employeeID", FilterOperator.EQ, sEmployeeID));
                let aPhoneContexts = await oPhoneBindList.requestContexts();
                for (let oPhoneContext of aPhoneContexts) {
                    await oPhoneContext.delete();
                }

                // Eliminar el empleado (oCtx.delete() no funciona correctamente)
                // await oCtx.delete();
                // Eliminar el empleado utilizando su ID (creo que REMOVE NO funciona)
                // await this.oModel.remove(`/Employees(${sEmployeeID})`);


                let oBindList = this.oModel.bindList("/Employees");
                let aFilter = new Filter("employeeID", FilterOperator.EQ, sEmployeeID);

                oBindList.filter(aFilter).requestContexts().then(function (aContexts) {
                    if (aContexts.length > 0) {
                        aContexts[0].delete().then(function () {
                            sap.m.MessageToast.show("Empleado eliminado con éxito");
                        })
                    }
                })
                //para quitar de la tabla, opcion 2 es hacer refresh de la tabla (llamarla de nuevo, pero es más pesada la carga de trabajo)
                await oCtx.delete();

                // Actualizar la vista
                this.refreshModel();
                sap.m.MessageToast.show("Empleado y sus datos asociados eliminados con éxito");
            },

            onEditPress: function (oEvent) {
                var oItem = oEvent.getSource().getParent();
                var oCtx = oItem.getBindingContext("oEmployeesData");
                this._oEditEmployeeDialog = sap.ui.xmlfragment("fioriabmempleados.view.fragments.EditEmployee", this);
                this.getView().addDependent(this._oEditEmployeeDialog);
                this._oEditEmployeeDialog.setBindingContext(oCtx, "oEmployeesData");
                this._oEditEmployeeDialog.open();
            },
            onSaveChangesPress: async function () {
                var oModel = this.getView().getModel("oEmployeesData");
                await oModel.submitBatch("myGroupId");
                this.refreshModel();
                sap.m.MessageToast.show("Cambios guardados con éxito");
                this._oEditEmployeeDialog.close();
            },
            onCancelChangesPress: async function () {
                var oModel = this.getView().getModel("oEmployeesData");
                await oModel.resetChanges("myGroupId");
                this.refreshModel();
                sap.m.MessageToast.show("Cambios descartados");
                this._oEditEmployeeDialog.close();
            },
            //Fin ABM

            refreshModel: function () {
                if (!this.oModel) {
                    this.oModel = this.getView().getModel("oEmployeesData");
                }
                sap.ui.core.BusyIndicator.show();
                this.oModel.refresh();
                sap.ui.core.BusyIndicator.hide();
            },

            onPressItem: function (oEvent) {
                var oItem = oEvent.getSource();
                var oCtx = oItem.getBindingContext("oEmployeesData");
                var sID = oCtx.getProperty("employeeID");

                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("detail", { employeeID: sID });
            },
        });
    }
);
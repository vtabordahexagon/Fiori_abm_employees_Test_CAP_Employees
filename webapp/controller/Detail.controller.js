sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (Controller, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("fioriabmempleados.controller.Detail", {
      onInit: function () {
        //inicializamos el componente, router y modelo de la vista
        var oOwnerComponent = this.getOwnerComponent();
        this.oView = this.getView();
        this.oRouter = oOwnerComponent.getRouter();
        this.oModel = oOwnerComponent.getModel('oEmployeesData');

        // Verifica que el modelo sea un modelo OData V4
        if (!(this.oModel instanceof sap.ui.model.odata.v4.ODataModel)) {
          console.error("El modelo no es un modelo OData V4");
          return;
        }
        this.getView().setModel(this.oModel, "oEmployeesData");

        //creamos la relacion de ruteo entre las vistas y los parametros pasados
        this.oRouter.getRoute("detail").attachPatternMatched(this.onRouteMatched, this);
      },

      // Creamos la funcion que reciba los parametros del evento de seleccion de item y le asigne sus datos
      onRouteMatched: function (oEvent) {
        //obtengo el ID y el objeto empleado
        this.sEmployeeID = oEvent.getParameter("arguments").employeeID;
        this.getEmployee(this.sEmployeeID);
      },
      // Guardamos el objeto de la vista (el empleado)
      getEmployee: function (sEmployeeID) {
        sap.ui.core.BusyIndicator.show();
        this.sPath = "/Employees(" + sEmployeeID + ")";
        this.oView.bindElement({
          path: this.sPath,
          model: "oEmployeesData",
          parameters: {
            $$updateGroupId: "myGroupId",
          },
          events: {
            dataReceived: function (oData) {
              sap.ui.core.BusyIndicator.hide()
            }.bind(this)
          }
        });
      },

      //Funciones Generales
      onBackButton: function () {
        this.refreshModel();
        this.oRouter.navTo("master") //navTo("Master",{},true)
      },
      refreshModel: function () {
        sap.ui.core.BusyIndicator.show();
        this.oModel.refresh();
        sap.ui.core.BusyIndicator.hide();
      },
      updateView: async function () {
        await this.getEmployee(this.sEmployeeID);
      },

      // Función para el filtrado (barra de busqueda) de cada tabla
      onFilterEmployeeEmails: function (oEvent) {
        // Se obtiene el texto de búsqueda ingresado en la barra de búsqueda
        let sQuery = oEvent.getParameter("query");

        // Obtener la tabla de órdenes del cliente y sus items
        let oEmployeeEmailsTable = this.getView().byId("EmployeeEmailsTable");
        let oBinding = oEmployeeEmailsTable.getBinding("items");

        let aFilters = [];

        // Crear un filtro para OrderID escrito en la barra de búsqueda
        if (sQuery) {
          const oTextFilter = new Filter({ path: "emailAddress", operator: FilterOperator.Contains, value1: sQuery });
          //Arriba usamos EQ porque es un ENTERO, si fuera String usaríamos Contains (esto se saca de la $metadata del modelo) 
          aFilters.push(oTextFilter);
        }

        // Aplicar el filtro
        oBinding.filter(aFilters);
      },
      onFilterEmployeePhones: function (oEvent) {
        // Se obtiene el texto de búsqueda ingresado en la barra de búsqueda
        let sQuery = oEvent.getParameter("query");

        // Obtener la tabla de órdenes del cliente y sus items
        let oEmployeePhonesTable = this.getView().byId("EmployeePhonesTable");
        let oBinding = oEmployeePhonesTable.getBinding("items");

        let aFilters = [];

        // Crear un filtro para OrderID escrito en la barra de búsqueda
        if (sQuery) {
          const oTextFilter = new Filter({ path: "phoneNumber", operator: FilterOperator.Contains, value1: sQuery });
          //Arriba usamos EQ porque es un ENTERO, si fuera String usaríamos Contains (esto se saca de la $metadata del modelo) 
          aFilters.push(oTextFilter);
        }

        // Aplicar el filtro
        oBinding.filter(aFilters);
      },

      //ABM Empleado
      onEditButton: function (oEvent) {
        this.toggleFooter();
      },
      toggleFooter: function () {
        let settingsModel = this.getView().getModel("appView");
        settingsModel.setProperty(
          "/showFooter",
          !settingsModel.getProperty("/showFooter")
        );
        settingsModel.setProperty(
          "/editableEmployee",
          !settingsModel.getProperty("/editableEmployee")
        );
      },
      guardarCambiosEmpleado: async function () {
        await this.oModel.submitBatch("myGroupId");
        this.toggleFooter();
      },
      cancelarCambiosEmpleado: async function () {
        await this.oModel.resetChanges("myGroupId");
        this.toggleFooter();
      },

      //ABM Emails (bindeado en la vista con su batch)
      onAddEmailPress: function (oEvent) {
        if (!this._oAddEmailDialog) {
          this._oAddEmailDialog = sap.ui.xmlfragment("fioriabmempleados.view.fragments.AddEmail", this);
          this.getView().addDependent(this._oAddEmailDialog);
        }
        this._oAddEmailDialog.open();
      },
      onCancelEmail: function () {
        this._oAddEmailDialog.close();
      },
      onPostEmail: async function (oEvent) {
        var sEmailAddress = sap.ui.getCore().byId("emailAddressInput").getValue();
        var sEmailType = sap.ui.getCore().byId("emailTypeInput").getValue();
        var sEmployeeID = this.sEmployeeID;

        // Verificar que el email no exista
        this.oModel.bindList("/Emails").requestContexts().then(async function (aContexts) {
          var bExists = aContexts.some(function (oContext) {
            return oContext.getProperty("emailAddress") === sEmailAddress;
          });

          if (bExists) {
            sap.m.MessageToast.show("Email already exists.");
            return;
          }

          // Crear el nuevo email usando el modelo OData
          let oEmailBindList = this.oModel.bindList("/Emails");
          await oEmailBindList.create({
            emailAddress: sEmailAddress,
            type: sEmailType,
            employeeID_employeeID: sEmployeeID
          });

          // Actualizar la vista
          await this.updateView();
          this._oAddEmailDialog.close();

        }.bind(this)).catch(function (error) {
          console.error("Error verifying emails:", error);
        });
      },
      onDeleteEmailPress: function (oEvent) {
        //hacer DELETE del mail seleccionado (obtenido por oEvent) y refrescar la tabla
        var oItemContext = oEvent.getSource().getParent().getBindingContext("oEmployeesData");
        var sEmailID = oItemContext.getPath().match(/emails\(([^)]+)\)/)[1]; //para extrar el id del Email

        let oBindList = this.oModel.bindList("/Emails");
        let aFilter = new Filter("emailID", FilterOperator.EQ, sEmailID);

        oBindList.filter(aFilter).requestContexts().then(function (aContexts) {
          if (aContexts.length > 0) {
            aContexts[0].delete().then(function () {
              sap.m.MessageToast.show("Email eliminado con éxito");
            })
          }
        })
        //hacemos el refresh de la tabla
        this.refreshModel();
      },
      onEditEmailsPress: function () {
        //hacemos visible el guarda y reset, quitamos el edit (cuando es llamado desde save o cancel, se invierte)
        let settingsModel = this.getView().getModel("appView");
        settingsModel.setProperty(
          "/visibleSaveEmailsEdit",
          !settingsModel.getProperty("/visibleSaveEmailsEdit")
        );
        settingsModel.setProperty(
          "/editableEmailsTable",
          !settingsModel.getProperty("/editableEmailsTable")
        );
      },
      onSaveEmailChangesPress: async function (oEvent) {
        await this.oModel.submitBatch("emailsEmployeeTableBatchId");
        this.onEditEmailsPress();
      },
      onCancelEmailChangesPress: async function (oEvent) {
        await this.oModel.resetChanges("emailsEmployeeTableBatchId");
        this.onEditEmailsPress();
      },

      //ABM Phones (bindeado en la vista con su batch)
      onAddPhonePress: function (oEvent) {
        if (!this._oAddPhoneDialog) {
          this._oAddPhoneDialog = sap.ui.xmlfragment("fioriabmempleados.view.fragments.AddPhone", this);
          this.getView().addDependent(this._oAddPhoneDialog);
        }
        this._oAddPhoneDialog.open();
      },
      onCancelPhone: function () {
        this._oAddPhoneDialog.close();
      },
      onPostPhone: async function () {
        // Obtengo los valores
        var sPhoneNumber = sap.ui.getCore().byId("phoneNumberInput").getValue();
        var sPhoneType = sap.ui.getCore().byId("phoneTypeInput").getValue();
        var sEmployeeID = this.sEmployeeID;

        let oPhoneBindList = this.oModel.bindList("/Phones");
        var aContexts = await this.oModel.bindList("/Phones").requestContexts();
        let bExists = aContexts.some(function (oContext) { return oContext.getProperty("phoneNumber") === sPhoneNumber; });

        if (bExists) {
          sap.m.MessageToast.show("Phone already exists.");
          return;
        }

        await oPhoneBindList.create({
          phoneNumber: sPhoneNumber,
          type: sPhoneType,
          employeeID_employeeID: sEmployeeID
        });

        // Actualizar la vista
        await this.updateView();
        this._oAddPhoneDialog.close();
      },
      onDeletePhonePress: function (oEvent) {
        //hacer DELETE del telefono seleccionado (obtenido por oEvent) y refrescar la tabla
        var oItemContext = oEvent.getSource().getParent().getBindingContext("oEmployeesData");
        var sPhoneID = oItemContext.getPath().match(/phones\(([^)]+)\)/)[1]; //para extrar el id del telefono

        let oBindList = this.oModel.bindList("/Phones");
        let aFilter = new Filter("phoneID", FilterOperator.EQ, sPhoneID);

        oBindList.filter(aFilter).requestContexts().then(function (aContexts) {
          if (aContexts.length > 0) {
            aContexts[0].delete().then(function () {
              sap.m.MessageToast.show("Telefono eliminado con éxito");
            })
          }
        })

        //hacemos el refresh de la tabla
        this.refreshModel();
      },
      onEditPhonesPress: function () {
        //hacemos visible el guardar y reset, quitamos el edit (cuando es llamado desde save o cancel, se invierte)
        let settingsModel = this.getView().getModel("appView");
        settingsModel.setProperty(
          "/visibleSavePhonesEdit",
          !settingsModel.getProperty("/visibleSavePhonesEdit")
        );
        settingsModel.setProperty(
          "/editablePhonesTable",
          !settingsModel.getProperty("/editablePhonesTable")
        );
      },
      onSavePhoneChangesPress: async function (oEvent) {
        await this.oModel.submitBatch("phonesEmployeeTableBatchId");
        this.onEditPhonesPress();
      },
      onCancelPhonesChangesPress: async function (oEvent) {
        await this.oModel.resetChanges("phonesEmployeeTableBatchId");
        this.onEditPhonesPress();
      },



    });
  });
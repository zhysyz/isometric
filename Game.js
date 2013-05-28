import event.Emitter as Emitter;

import .models.GridModel as GridModel;
import .models.GridControlModel as GridControlModel;
import .models.GridEditor as GridEditor;
import .models.item.DynamicModel as DynamicModel;

import .views.WorldView as WorldView;

import .ModelViewConnector;

/**
 * Wrapper class for both isometric models and views.
 *
 * Events:
 *  - SelectionCount
 *      Published when an area is selected for drawing.
 *      Parameter: null|{total,changed}
 * - SelectionEnd
 *      End of selecting an area.
 * - SelectItem
 *      Select an item.
 * - UnselectItem
 *      Unselect by clicking on an "empty" spot.
 */
exports = Class(Emitter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);

		// Create views...
		this._worldView = new WorldView(opts);
		this._worldView.
			on('ChangeOffset', bind(this, 'onChangeOffset'));

		var gridView = this._worldView.getGridView();
		var gridControlView = this._worldView.getGridControlView();

		// Create models...
		this._gridModel = new GridModel({
			gridSettings: opts.gridSettings,
			mapSettings: opts.mapSettings
		});

		this._gridEditor = new GridEditor({
			gridModel: this._gridModel,
			settings: opts.editorSettings
		});
		this._gridEditor.
			on('RefreshMap', bind(gridView, 'onRefreshMap')).
			on('AddModel', bind(this, 'onAddStaticModel')).
			on('SelectionCount', bind(this, 'emit', 'SelectionCount'));

		this._gridModel.
			on('Update', bind(gridView, 'onUpdate')).
			on('RefreshMap', bind(gridView, 'onRefreshMap')).
			on('SelectionChange', bind(this._gridEditor, 'onSelectionChange')).
			on('Selection', bind(this._gridEditor, 'onSelectionApply')).
			on('Progress', bind(this, 'onProgress')).
			on('Point', bind(this, 'onPoint'));

		this._gridControlModel = new GridControlModel({
			gridModel: this._gridModel
		});
		this._gridControlModel.
			on('Selection', bind(this._gridEditor, 'onSelectionApply'));

		// Connect views...
		gridControlView.
			on('Start', bind(this._gridControlModel, 'onStart')).
			on('Drag', bind(this._gridControlModel, 'onDrag')).
			on('End', bind(this._gridControlModel, 'onEnd')).
			on('End', bind(this, 'emit', 'SelectionEnd')).
			on('Select', bind(this._gridControlModel, 'onSelect')).
			on('SelectCancel', bind(this._gridControlModel, 'onSelectCancel')).
			on('Pinch', bind(gridView, 'setScale'));

		gridView.
			on('SelectItem', bind(this, 'emit', 'SelectItem')).
			on('UnselectItem', bind(this, 'emit', 'UnselectItem'));

		this._modelViewConnector = new ModelViewConnector({
			gridView: gridView
		});
	};

	this.tick = function (dt) {
		this._gridModel.tick(dt);
		this._modelViewConnector.tick(dt);
	};

	this.onProgress = function (progress) {
		this._worldView.setProgress((100 * progress) | 0);
	};

	this.onChangeOffset = function (offsetX, offsetY) {
		this._gridModel.scrollBy(offsetX, offsetY);
	};

	this.onPinch = function (scale) {
		this._worldView.getGridView().setScale(scale);
	};

	this.onAddStaticModel = function (model) {
		this._gridModel.getStaticModels().add(model);

		model.on('SpawnedModel', bind(this, 'onAddDynamicModel'));
		model.on('WakeupModel', bind(this, 'onWakeupDynamicModel'));
	};

	this.onAddDynamicModel = function (model) {
		this._modelViewConnector.registerModel(model, 1);
	};

	this.onWakeupDynamicModel = function (model) {
		this._modelViewConnector.wakeupModel(model);
	};

	this.getGridEditor = function () {
		return this._gridEditor;
	};

	this.getGridView = function () {
		return this._worldView.getGridView();
	};

	this.getGridControlView = function () {
		return this._worldView.getGridControlView();
	};
});
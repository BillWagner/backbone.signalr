/**
 * Backbone SignalR Adapter
 * https://github.com/SrtSolutions/backbone.signalr
 */

(function () {
    // A simple module to replace `Backbone.sync` with *SignalR*-based
    // persistence. Models are sent to a SignalR hub where they are stored and then
    // broadcast back to anyone else who might be listening.

    // Hold reference to Underscore.js and Backbone.js in the closure in order
    // to make things work even if they are removed from the global namespace
    var _ = this._;
    var Backbone = this.Backbone;

    Backbone.SignalR = function (hubName) {
        var self = this;

        self.hubName = hubName;
        self.hub = $.connection[hubName];
        self.clientId = function () { return $.connection.hub.id; };
        self.collections = [];

        self.syncUpdates = function (collection) {
            self.collections.push(collection);
        };

        self.hub.created = function (clientId, data) {
            if (!self.collections) return;
            if (self.clientId() == clientId) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                collection.add(modelData);
            });
        };

        self.hub.updated = function (clientId, data) {
            if (!self.collections) return;
            if (self.clientId() == clientId) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                var existing = collection.get(modelData.id);

                if (existing) {
                    existing.set(modelData);
                } else {
                    collection.add(modelData);
                }
            });
        };

        self.hub.destroyed = function (clientId, data) {
            if (!self.collections) return;
            if (self.clientId() == clientId) return;

            var modelData = JSON.parse(data);

            _(self.collections).each(function (collection) {
                var existing = collection.get(modelData.id);
                if (existing) collection.remove(existing);
            });
            
        };
    };
 
    _.extend(Backbone.SignalR.prototype, {
        data: function (model) {
            return JSON.stringify(model.toJSON());
        },

        success: function(options) {
            return function (resp) {
                if (options.success) {
                    resp = JSON.parse(resp);
                    options.success(resp);
                }
            };
        },
        
        failure: function(options) {
            return function(resp) {
                if (options.error) {
                    options.error(resp);
                }
            };
        },
        
        callHub: function(action, model, options) {
            var data = model ? this.data(model) : null;
            return this.hub[action](data)
                .done(this.success(options))
                .fail(this.failure(options));
        },

        create: function (model, options) {
            return this.callHub("create", model, options);
        },

        update: function (model, options) {
            return this.callHub("update", model, options);
        },

        find: function (model, options) {
            return this.callHub("find", model, options);
        },

        findAll: function (options) {
            return this.callHub("findAll", null, options);
        },

        destroy: function (model, options) {
            return this.callHub("destroy", model, options);
        }
    });

    Backbone.SignalR.sync = Backbone.localSync = function (method, model, options, error) {
        var hub = model.signalRHub || model.collection.signalRHub;

        // Backwards compatibility with Backbone <= 0.3.3
        if (typeof options == 'function') {
            options = {
                success: options,
                error: error
            };
        }

        switch (method) {
            case "read": model.id != undefined ? hub.find(model, options) : hub.findAll(options); break;
            case "create": hub.create(model, options); break;
            case "update": hub.update(model, options); break;
            case "delete": hub.destroy(model, options); break;
        }

        return null;
    };

    Backbone.ajaxSync = Backbone.sync;

    Backbone.getSyncMethod = function (model) {
        if (model.signalRHub || (model.collection && model.collection.signalRHub)) {
            return Backbone.localSync;
        }

        return Backbone.ajaxSync;
    };

    Backbone.sync = function (method, model, options, error) {
        return Backbone.getSyncMethod(model).apply(this, [method, model, options, error]);
    };

})();
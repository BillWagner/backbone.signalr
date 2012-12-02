using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using SignalR;
using SignalR.Hubs;

namespace SRT.SignalR.Backbone
{
    public abstract class BackboneModelHub<HubT, ModelT> : Hub  
        where HubT : IHub
        where ModelT : class
    {
        private static IHubContext HubContext
        {
            get { return GlobalHost.ConnectionManager.GetHubContext<HubT>(); }
        }

        private static JsonSerializerSettings Settings
        {
            get { return new JsonSerializerSettings { ContractResolver = new CamelCasePropertyNamesContractResolver() }; }
        }

        private static ModelT Deserialize(string data)
        {
            return JsonConvert.DeserializeObject<ModelT>(data, Settings);
        }

        private static string Serialize(ModelT model)
        {
            return model != null ? JsonConvert.SerializeObject(model, Settings) : "{}";
        }

        private static string Serialize(IEnumerable<ModelT> models)
        {
            return models != null ? JsonConvert.SerializeObject(models, Settings) : "[]";
        }

        public static void BroadcastModelCreated(ModelT item)
        {
            HubContext.Clients.created(-1, Serialize(item));
        }

        public static void BroadcastModelUpdated(ModelT item)
        {
            HubContext.Clients.updated(-1, Serialize(item));
        }

        public static void BroadcastModelDestroyed(ModelT item)
        {
            HubContext.Clients.destroyed(-1, Serialize(item));
        }

        public static void BroadcastCollectionReset(IEnumerable<ModelT> items)
        {
            HubContext.Clients.resetItems(Serialize(items));
        }

        protected virtual ModelT CreateModel(ModelT model)
        {
            return model;
        }

        protected virtual ModelT UpdateModel(ModelT model)
        {
            return model;
        }

        protected virtual ModelT FindModel(ModelT model)
        {
            return null;
        }

        protected virtual IEnumerable<ModelT> FindModels()
        {
            return new List<ModelT>();
        }

        protected virtual ModelT DeleteModel(ModelT model)
        {
            return null;
        }

        public string Create(string data)
        {
            var model = Deserialize(data);
            model = CreateModel(model);
            
            var result = Serialize(model);

            Clients.created(Context.ConnectionId, result);
            return result;
        }

        public string Update(string data)
        {
            var model = Deserialize(data);
            model = UpdateModel(model);

            var result = Serialize(model);
            Clients.updated(Context.ConnectionId, result);
            return result;
        }

        public string Find(string data)
        {
            var model = Deserialize(data);
            model = FindModel(model);

            var result = Serialize(model);
            return result;
        }

        public string FindAll()
        {
            var items = FindModels();

            var result = Serialize(items);
            return result;
        }

        public string Destroy(string data)
        {
            var model = Deserialize(data);
            model = DeleteModel(model);

            var result = Serialize(model);
            Clients.destroyed(Context.ConnectionId, result);
            return result;
        }
    }
}
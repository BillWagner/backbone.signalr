using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using SignalR.Hubs;

namespace SRT.SignalR.Backbone
{
    public abstract class BackboneModelHub<T> : Hub where T : class
    {
        protected virtual T CreateModel(T model)
        {
            return model;
        }

        protected virtual T UpdateModel(T model)
        {
            return model;
        }

        protected virtual T FindModel(T model)
        {
            return null;
        }

        protected virtual IEnumerable<T> FindModels()
        {
            return new List<T>();
        }

        protected virtual T DeleteModel(T model)
        {
            return null;
        }

        private JsonSerializerSettings Settings
        {
            get { return new JsonSerializerSettings {ContractResolver = new CamelCasePropertyNamesContractResolver()}; }
        }

        private T Deserialize(string data)
        {
            return JsonConvert.DeserializeObject<T>(data, Settings);
        }

        private string Serialize(T model)
        {
            return model != null ? JsonConvert.SerializeObject(model, Settings) : "{}";
        }

        private string Serialize(IEnumerable<T> models)
        {
            return models != null ? JsonConvert.SerializeObject(models, Settings) : "[]";
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
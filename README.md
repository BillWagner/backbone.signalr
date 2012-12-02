backbone.signalr
================

Welcome to Backbone.SignalR, the sync layer for BackboneJS that lets you talk to a SignalR Server Hub.

[Backbone.js ](http://backbonejs.org/) has a powerful model abstraction that allows you to synchronize your data with any data source (via Backbone.sync).  By default, Backbone models "sync" with REST services, but the Backbone.sync layer is replacable.  Backbone.signalr allows your models to "sync" with a real-time [SignalR](http://signalr.net/) hub very easily.  In addition, all models on all clients will get updated in real-time!

# Getting Started #
There are two simple ways to use Backbone.SignalR:


## Installing the Nuget Package ##

You can search for it with the name Backbone.SignalR or you can install it directly via the [Package Manager Console](http://docs.nuget.org/docs/start-here/using-the-package-manager-console):

`PM> Install-Package Backbone.SignalR`

This will bring in the dependencies of SignalR and Backbone.js if you don't already have it.  It will put `backbone.signalr.js` in your **Scripts** folder and it will put `BackboneModelHub.cs` into your **Hubs** folder

## Include the files manually ##
If you don't want to use the Nuget package, you can simply include the **client/backbone.signalr.js** file in your project and then copy **server/BackboneModelHub.cs** somewhere in your project and that is all you need.

# Using the Backbone Model Hub #

You need to create a Model Hub in order to synchronize with the Backbone Frontend.  The base class handles the communication and updates, but you have control over how the data is managed.  Let's say, for instance, that you have a model called **Person**:

```csharp
public class Person
{
    public string First { get; set; }
    public string Last { get; set; }
}
```

You can create a **PersonHub** which stores models in a collection for demonstration.  Override the actions that you want to support:
```csharp
public class PersonHub : BackboneModelHub<PersonHub, Person>
{
    private static readonly List<Person> people = new List<Person>();

    protected override Person CreateModel(Person person)
    {
        person.Id = Guid.NewGuid();
        people.Add(person);
        return person;
    }

    protected override IEnumerable<Person> FindModels()
    {
        return people;
    }
}
``` 

Of course, the actual mechanism to store and retrieve your data is up to you.  You might be talking to a service layer or an ORM.  The static list is just an example.

**Important:** Note that the **PersonHub** is responsible for creating a unique identifier of some sort.  This might happen in your ORM, or you might add it here.  It is all up to you.

More overrides on the **BackboneModelHub** include:

- UpdateModel
- FindModel
- DeleteModel

```csharp
    protected override Person UpdateModel(Person model)
    {
        var location = people.FindIndex(p => p.Id == model.Id);
        if (location < 0) return model;

        people[location] = model;
        return model;
    }

    protected override Person FindModel(Person model)
    {
        return people.Find(p => p.Id == model.Id);
    }

    protected override Person DeleteModel(Person model)
    {
        var existing = people.Find(p => p.Id == model.Id);

        if (existing == null) return null;

        people.Remove(existing);
        return existing;
    }
```

# Using the Client-Side Sync Layer #
You will need to include SignalR, the Hubs, and **Backbone.signalr.js**

```html
<script src="~/Scripts/jquery.signalR-0.5.3.min.js"></script>
<script src="signalr/hubs" type="text/javascript"></script>
<script src="~/Scripts/backbone.signalr.js"></script>
```

Then, you can tell your collection to synchronize with the backend:

```javascript
var Person = Backbone.Model.extend({});
var People = Backbone.Collection.extend({
	model: Person,
	signalRHub: new Backbone.SignalR("personHub")
});
```

Now, after you start your SignalR connection, you can fetch, create, update and destroy data via SignalR:

```javascript
var people = new People();

$.connection.hub.start().done(function() {
   people.fetch();
});
````

If you want it to listen to real-time changes that are pushed from the server, simply tell it to do so.  All clients who are listening will get model updates automatically:

```javascript
initialize: function() {
	this.signalRHub.syncUpdates(this);
}
```

# Optional: Hybrid approach #
If you already have existing controller that you want to use and you don't want to duplicate your efforts in the hub, it is pretty easy.  This is a hybrid approach and allows you to maintain a standard REST api for traditional communication but allows your clients to synchronize changes when they happen.

In this case, you can create your hub without any persistence details:

```csharp
public class PersonHub : BackboneModelHub<PersonHub, Person>
{
}
```

The hub exposes several static methods that can be called from anywhere:

- BroadcastModelCreated 
- BroadcastModelUpdated
- BroadcastModelDestroyed
- BroadcastCollectionReset

The last one (BroadcastCollectionReset) is used when your entire back-end collection has changed enough so that you want to tell all of the clients that they need to reset.  The synchronization on the client will call Collection.reset with the collection you send it.

So, imagine you have a WebAPI controller that manages people.  You just need to call the Hub's static methods:

```csharp
public class PeopleController : ApiController
{
    private static readonly List<Person> People = new List<Person>();

    public IEnumerable<Person> Get()
    {
        return People;
    }

    public Person Get(Guid id)
    {
        return People.Find(p => p.Id == id);
    }

    public Person Post([FromBody]Person model)
    {
        model.Id = Guid.NewGuid();
        People.Add(model);

        PersonHub.BroadcastModelCreated(model);

        return model;
    }

    public Person Put(Guid id, [FromBody]Person model)
    {
        var location = People.FindIndex(p => p.Id == model.Id);
        if (location < 0) return model;

        People[location] = model;

        PersonHub.BroadcastModelUpdated(model);

        return model;
    }

    public Person Delete(Guid id)
    {
        var model = Get(id);
        if (model == null) return null;

        People.Remove(model);

        PersonHub.BroadcastModelDestroyed(model);

        return model;
    }
}
```

The Client-side javascript collection would synchronize with the REST service like it normally would:

```javascript
var Person = Backbone.Model.extend({});
var People = Backbone.Collection.extend({
	model: Person,
	url: "/api/person"
});
```

But when you create your collection, you sync updates that come from SignalR:

```javascript
var people = new People();
new Backbone.SignalR("personHub").syncUpdates(people);
people.fetch();

$.connection.hub.start();
```

# Contributions #

If you can think of any way to make this integration better, please let me know.  I will consider all pull requests as wel as recommendations.  
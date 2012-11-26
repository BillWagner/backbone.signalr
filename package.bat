del *.nupkg
rmdir /S /Q nuget\Content

mkdir nuget\Content
mkdir nuget\Content\Hubs
mkdir nuget\Content\Scripts

cp server\BackboneModelHub.cs nuget\Content\Hubs\BackboneModelHub.cs
cp client\backbone.signalr.js nuget\Content\Scripts\backbone.signalr.js

.\nuget.exe pack nuget\Package.nuspec
var makeMap = (fetchData) => {
  var geoJSONObj = {
    type: "FeatureCollection",
    features: [],
  }; //프로미스 객체의 값을 배열에 옮겨 담기 위함 (옮겨 담으면서 ,로 자르기도 같이 실행)
  for (let key in fetchData) {
    var data = fetchData[key].split(",");
    geoJSONObj.features.push({
      type: "Feature",
      properties: {
        DATE: data[0],
        CP: data[3],
        MWS: data[4],
        "15R": data[5],
        "25R": data[6],
      },
      geometry: {
        coordinates: ol.proj.fromLonLat(
          [Number(data[2]), Number(data[1])],
          "EPSG:3857"
        ),
        type: "Point",
      },
    });
  }

  var center =
    geoJSONObj.features[(geoJSONObj.features.length / 2).toFixed()].geometry
      .coordinates;

  var pointSource = new ol.source.Vector({
    features: new ol.format.GeoJSON().readFeatures(geoJSONObj),
  });

  var lineFeatures = [];
  for (let i = 0; i < geoJSONObj.features.length - 1; i++) {
    var lineFeature = new ol.Feature(
      new ol.geom.LineString([
        geoJSONObj.features[i].geometry.coordinates,
        geoJSONObj.features[i + 1].geometry.coordinates,
      ])
    );
    lineFeatures.push(lineFeature);
  }

  var lineSource = new ol.source.Vector({
    features: lineFeatures,
  });

  var styles = {
    Point: new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({
          color: "red",
        }),
        stroke: new ol.style.Stroke({
          color: "black",
          width: 2,
        }),
        radius: 4,
      }),
    }),
    LineString: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "red",
        width: 1,
      }),
    }),
  };

  var pointLayer = new ol.layer.Vector({
    source: pointSource,
    style: styles.Point,
  });

  var lineLayer = new ol.layer.Vector({
    source: lineSource,
    style: styles.LineString,
  });

  var osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM({
      wrapX: false,
    }),
  });

  var map = new ol.Map({
    layers: [osmLayer, lineLayer, pointLayer],
    target: "map",
    view: new ol.View({
      center: center,
      zoom: 5,
    }),
  });

  var popUpDiv = document.querySelector("#popUp");
  var date = document.querySelector("#date");
  var coor = document.querySelector("#coor");
  var cp = document.querySelector("#cp");
  var mws = document.querySelector("#mws");
  var sr = document.querySelector("#sr");
  var lr = document.querySelector("#lr");

  var popUpOnMap = new ol.Overlay({
    element: popUpDiv,
  });

  map.addOverlay(popUpOnMap);

  map.on("pointermove", function (e) {
    var onHover = map.forEachFeatureAtPixel(
      e.pixel,
      function (feature) {
        return feature;
      },
      {
        layerFilter: function (layer) {
          return layer === pointLayer;
        },
      }
    );
    if (onHover) {
      var coordinate = onHover.getGeometry().getCoordinates();
      var coor4326 = ol.proj
        .transform(coordinate, "EPSG:3857", "EPSG:4326")
        .map((coor) => coor.toFixed(1));
      var proInfo = onHover.getProperties();
      popUpOnMap.setPosition(coordinate);

      date.innerHTML =
        "0000년 제00호 태풍_ _ _" +
        "<br>" +
        `${proInfo.DATE.slice(0, 4)}.${proInfo.DATE.slice(
          4,
          6
        )}.${proInfo.DATE.slice(6, 8)}. ${proInfo.DATE.slice(8, 10)}시`;
      coor.innerHTML = `중심위치: ${coor4326[1]}&deg;N ${coor4326[0]}&deg;E`;
      cp.innerHTML = `중심기압: ${proInfo.CP} hPa`;
      mws.innerHTML = `최대풍속: ${proInfo.MWS} m/s`;
      sr.innerHTML = `강풍반경: ${proInfo["15R"]} km`;
      lr.innerHTML = `폭풍반경: ${proInfo["25R"]} km`;

      popUpDiv.style.display = "block";
    } else {
      popUpDiv.style.display = "none";
    }
  });

  var mousePosition = new ol.control.MousePosition({
    coordinateFormat: ol.coordinate.createStringXY(2),
    projection: "EPSG:4326",
    undefinedHTML: "outside",
  });

  map.addControl(mousePosition);
};

const fetchDataFunc = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:5501/%23PROJECT/TY2009_MAYSAK.txt"
    ).then((res) => {
      return res.text();
    });
    return response.split("\r\n");
  } catch {}
};

//없앨 수 있지 않을까??
fetchDataFunc().then((res) => {
  res.splice(0, 1);
  makeMap(res);
});

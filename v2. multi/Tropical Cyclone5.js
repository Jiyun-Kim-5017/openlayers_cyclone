//fetch data
const multidata = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:5501/%23PROJECT/typhoon.txt"
    ).then((res) => res.text());
    return response;
  } catch {
    console.log("실패");
  }
};

//data > json
const makeJSON = (data) => {
  var dataObj = {};
  var dataArr = data.split("\r\n").filter((data) => data != "");
  var indexArr = [];

  //태풍 이름 있는 인덱스 추출
  dataArr.forEach((data) => {
    if (data.includes("태풍")) {
      indexArr.push(dataArr.indexOf(data));
    }
  });

  //태풍 이름
  const makeName = (index) => {
    return dataArr[index].split(" ")[1];
  };

  //이름 인덱스를 기준으로 잘라서 dataObj에 저장
  indexArr.forEach((index, idx) => {
    let name = makeName(index);
    dataObj[name] = [];

    for (let i = index + 1; i < indexArr[idx + 1]; i++) {
      dataObj[name].push(dataArr[i]);
    }
  });

  //마지막 태풍 따로 저장(indexArr 관련)
  var lastTypoon = indexArr.at(-1);
  for (let i = lastTypoon + 1; i < dataArr.length; i++) {
    let name = makeName(lastTypoon);
    dataObj[name].push(dataArr[i]);
  }

  //세부 항목별로 다시 잘라서 배열화 후 geoJSON 형태로 재저장
  for (let typhoon in dataObj) {
    var tempoArr = [...dataObj[typhoon].map((data) => data.split(","))];

    dataObj[typhoon] = {
      type: "FeatureCollection",
      features: [],
    };

    tempoArr.forEach((data) => {
      dataObj[typhoon].features.push({
        type: "Feature",
        properties: {
          DATE: data[0],
          CP: data[3],
          MWS: data[4],
          "15R": data[5],
          "25R": data[6],
          coordinate: [Number(data[2]), Number(data[1])],
        },
        geometry: {
          coordinates: ol.proj.fromLonLat(
            [Number(data[2]), Number(data[1])],
            "EPSG:3857"
          ),
          type: "Point",
        },
      });
    });
  }

  return dataObj;
};

//맵 그리기
const makeMap = (dataObj) => {
  //각 태풍별 레이어 객체
  var layer = {};

  //태풍별 스타일 지정 객체
  var lineColor = {};

  var makeSomeNum = () => {
    return (Math.random() * 220).toFixed();
  };

  //컬러 랜덤 생성
  for (let key in dataObj) {
    lineColor[
      key
    ] = `rgb(${makeSomeNum()}, ${makeSomeNum()}, ${makeSomeNum()})`;
  }

  //스타일 함수
  var styleFunc = (e) => {
    var type = e.getGeometry().getType();
    let name = e.get("name");
    if (type === "Point") {
      return new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: "rgba(234, 84, 85, 0.3)",
          }),
          stroke: new ol.style.Stroke({
            color: "black",
            width: 1.5,
          }),
          radius: 3,
        }),
      });
    } else {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: lineColor[name],
          width: 1,
        }),
      });
    }
  };

  //배경지도
  var osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM({}),
  });

  var map = new ol.Map({
    layers: [osmLayer],
    target: "map",
    view: new ol.View({
      center: new ol.proj.fromLonLat([135, 22], "EPSG:3857"),
      zoom: 5,
    }),
  });

  //dataObj 안에서 하나씩 꺼내 레이어 제작 후 map에 추가 (옵션 생성 동시에)
  var buttonBox = document.querySelector("#selectBox");

  for (let key in dataObj) {
    //선 피쳐 생성
    var lineFeatures = [];
    for (let i = 0; i < dataObj[key].features.length - 1; i++) {
      var lineFeature = new ol.Feature(
        new ol.geom.LineString([
          dataObj[key].features[i].geometry.coordinates,
          dataObj[key].features[i + 1].geometry.coordinates,
        ])
      );
      lineFeature.set("name", key);
      lineFeatures.push(lineFeature);
    }

    //점 피쳐 생성
    var pointFeatures = new ol.format.GeoJSON().readFeatures(dataObj[key]);
    pointFeatures.forEach((feat) => feat.set("name", key));

    //합쳐서 레이어 소스 생성
    var vectorSource = new ol.source.Vector({
      features: [...pointFeatures, ...lineFeatures],
      wrapX: false,
    });

    //태풍별 레이어
    var typhoonLayer = new ol.layer.Vector({
      source: vectorSource,
      style: styleFunc,
    });

    layer[key] = typhoonLayer;
    map.addLayer(typhoonLayer);

    //태풍 선택 옵션(이름) 추가
    var newbutton = document.createElement("option");
    newbutton.innerHTML = key;
    newbutton.setAttribute("value", key);
    buttonBox.appendChild(newbutton);
  }

  //버튼별 태풍 노출
  var selectBox = document.querySelector("#selectBox");
  var removeAllLayer = () => {
    for (let key in layer) {
      map.removeLayer(layer[key]);
    }
  };
  var removeAllLayer = () => {
    for (let key in layer) {
      map.removeLayer(layer[key]);
    }
  };
  var addAllLayer = () => {
    for (let key in layer) {
      map.addLayer(layer[key]);
    }
  };

  var changeSelect = () => {
    let name = selectBox.options[selectBox.selectedIndex].value;

    if (name === "all") {
      removeAllLayer();
      addAllLayer();
    } else {
      removeAllLayer();
      map.addLayer(layer[name]);
    }
  };

  selectBox.addEventListener("change", changeSelect);

  //마우스 위치 좌표
  var mousePosition = new ol.control.MousePosition({
    coordinateFormat: ol.coordinate.createStringXY(2),
    projection: "EPSG:4326",
    undefinedHTML: "outside",
  });

  map.addControl(mousePosition);

  //정보창 팝업
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

  var makeDate = (date) => {
    return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(
      6,
      8
    )}. ${date.slice(8, 10)}시`;
  };

  map.addOverlay(popUpOnMap);
  map.on("pointermove", function (e) {
    var onHover = map.forEachFeatureAtPixel(e.pixel, function (feature) {
      return feature;
    });

    var featureGeo, name;

    if (onHover) {
      featureGeo = onHover.getGeometry();
      name = onHover.get("name");
      popUpDiv.style.backgroundColor = lineColor[name];
    }

    //점 위에 마우스 오버
    if (onHover && featureGeo.getType() === "Point") {
      let {
        DATE,
        CP,
        MWS,
        coordinate,
        "15R": srNum,
        "25R": lrNum,
      } = onHover.getProperties();
      date.innerHTML =
        `${DATE.slice(0, 4)}년 제00호 태풍 ${name}` + "<br>" + makeDate(DATE);
      coor.innerHTML = `중심위치: ${coordinate[1]}&deg;N ${coordinate[0]}&deg;E`;
      cp.innerHTML = `중심기압: ${CP} hPa`;
      mws.innerHTML = `최대풍속: ${MWS} m/s`;
      sr.innerHTML = `강풍반경: ${srNum} km`;
      lr.innerHTML = `폭풍반경: ${lrNum} km`;
      popUpOnMap.setPosition(featureGeo.getCoordinates());
      popUpDiv.style.display = "block";
    } else if (onHover && featureGeo.getType() === "LineString") {
      //선 위에 마우스 오버
      var start = dataObj[name].features[0].properties.DATE;
      var end = dataObj[name].features.at(-1).properties.DATE;

      date.innerHTML =
        `${start.slice(0, 4)}년 제00호 태풍 ${name}` +
        "<br>" +
        `${makeDate(start)} ~ ${makeDate(end)}`;
      coor.innerHTML = "";
      cp.innerHTML = "";
      mws.innerHTML = "";
      sr.innerHTML = "";
      lr.innerHTML = "";
      popUpOnMap.setPosition(e.coordinate);
      popUpDiv.style.display = "block";
    } else {
      popUpDiv.style.display = "none";
    }
  });
};

//데이터 패칭하면서 맵 그리는 함수 실행
multidata().then((res) => {
  makeMap(makeJSON(res));
});

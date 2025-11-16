// Khởi tạo bản đồ trung tâm Việt Nam
const map = L.map("map", {
  attributionControl: false,
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  dragging: false,
  touchZoom: false,
}).setView([16, 110], window.innerWidth < 768 ? 5.2 : 5.8);

// Thay đổi kích thước cửa sổ -> cập nhật lại hiển thị bản đồ
window.addEventListener("resize", function () {
  map.invalidateSize();
  const newZoom = this.window.innerWidth < 768 ? 5.2 : 5.8;
  map.setView([16, 108], newZoom);
});

// Tải đồng thời 2 file: bản đồ .geojson và dữ liệu .csv
Promise.all([
  d3.json("file_data/tinhthanh_new.geojson"),
  d3.csv("file_data/liet_si_tinh_thanh.csv"),
])
  .then(function (data) {
    const geojsonData = data[0];
    const csvData = data[1];

    // 1. Chuẩn bị dữ liệu CSV để join
    const dataMap = new Map();
    csvData.forEach((row) => {
      dataMap.set(row["Địa phương"], +row["Số liệt sĩ"]);
    });

    // 2. Gắn dữ liệu CSV vào GeoJSON
    geojsonData.features.forEach((feature) => {
      const tenTinh = feature.properties.ten_tinh;
      const soLietSi = dataMap.get(tenTinh);
      feature.properties.so_liet_si = soLietSi || 0;
    });

    // 3. Hàm định nghĩa màu sắc (Choropleth)
    function getColor(d) {
      return d > 80000
        ? "#800026"
        : d > 70000
        ? "#BD0026"
        : d > 50000
        ? "#E31A1C"
        : d > 30000
        ? "#FC4E2A"
        : d > 20000
        ? "#FD8D3C"
        : d > 10000
        ? "#FEB24C"
        : d > 5000
        ? "#FED976"
        : "#FFEDA0";
    }

    // 4. Hàm style cho từng tỉnh
    function style(feature) {
      return {
        fillColor: getColor(feature.properties.so_liet_si),
        weight: 1.5,
        opacity: 1,
        color: "white",
        dashArray: "3",
        fillOpacity: 0.8,
      };
    }

    // 5. Thêm tương tác (highlight khi di chuột)
    function createInteractions(geojsonLayer) {
      function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
          weight: 1,
          color: "#666",
          dashArray: "",
          fillOpacity: 1,
        });
      }

      function resetHighlight(e) {
        geojsonLayer.resetStyle(e.target);
      }

      function onEachFeature(feature, layer) {
        layer.on({
          mouseover: highlightFeature,
          mouseout: resetHighlight,
        });

        const tenTinh = feature.properties.ten_tinh;
        const soLieu = feature.properties.so_liet_si.toLocaleString("vi-VN");
        // THAY ĐỔI 1: Đổi lại thành bindPopup
        layer.bindPopup(
          `<b>${tenTinh}</b><br>Số liệt sỹ: ${
            soLieu > 0 ? soLieu : "Không có dữ liệu"
          }`
        );
      }

      return onEachFeature;
    }

    // 6. Vẽ lớp bản đồ GeoJSON cho map
    const geojsonLayer = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: createInteractions(null),
    }).addTo(map);

    // Update interactions after layer is created
    geojsonLayer.eachLayer(function (layer) {
      layer.openPopup();
      layer.on({
        mouseover: function (e) {
          const layer = e.target;
          layer.setStyle({
            weight: 1,
            color: "#666",
            dashArray: "",
            fillOpacity: 1,
          });
        },
        mouseout: function (e) {
          geojsonLayer.resetStyle(e.target);
        },
      });
    });

    // 7. Thêm Chú giải (Legend Control)
    const legend = L.control({ position: "topright" });
    legend.onAdd = function (map) {
      const div = L.DomUtil.create("div", "info legend");
      const grades = [0, 5000, 10000, 20000, 30000, 50000, 70000, 80000];
      div.innerHTML += "<b>Số lượng (người)</b><br>";

      for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
          '<i style="background:' +
          getColor(grades[i] + 1) +
          '"></i> ' +
          grades[i].toLocaleString("vi-VN") +
          (grades[i + 1]
            ? "&ndash;" + grades[i + 1].toLocaleString("vi-VN") + "<br>"
            : "+");
      }
      return div;
    };

    // THAY ĐỔI 2: Thêm tên 2 quần đảo (dạng in chìm)
    const islandLabelOptions = {
      permanent: true, // Luôn hiển thị, không cần hover
      direction: "center", // Căn giữa tại tọa độ
      className: "island-label", // Class riêng để CSS
    };

    // Tọa độ tương đối của 2 quần đảo
    const hoangSaCoords = [15.2, 112.4];
    const truongSaCoords = [6.8, 114.5];

    L.tooltip(islandLabelOptions)
      .setLatLng(hoangSaCoords)
      .setContent("Quần đảo Hoàng Sa")
      .addTo(map);

    L.tooltip(islandLabelOptions)
      .setLatLng(truongSaCoords)
      .setContent("Quần đảo Trường Sa")
      .addTo(map);
    legend.addTo(map);
  })
  .catch(function (error) {
    console.log("Lỗi khi tải dữ liệu:", error);
  });

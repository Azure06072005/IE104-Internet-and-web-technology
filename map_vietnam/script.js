// Khởi tạo bản đồ trung tâm Việt Nam
const map = L.map("map", {
  attributionControl: false, // tắt chữ "Leaflet"
  zoomControl: false, // zoom off
  scrollWheelZoom: false, // zoom by scroll off
  doubleClickZoom: false, // zoom by double click off
  dragging: false, // dragging off
  touchZoom: false, // touch zoom off
}).setView([17, 108], window.innerWidth < 768 ? 5.2 : 5.8);

// Thay đổi kích thước cửa sổ -> cập nhật lại hiển thị bản đồ
window.addEventListener("resize", function () {
  map.invalidateSize();
  const newZoom = this.window.innerWidth < 768 ? 5.2 : 5.8;
  map.setView([17, 108], newZoom);
});

// // Nền bản đồ từ OpenStreetMap
// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   maxZoom: 10,
//   minZoom: 6,
//   attribution: "© OpenStreetMap",
// }).addTo(map);

// Tải đồng thời 2 file: bản đồ .geojson và dữ liệu .csv
Promise.all([
  d3.json("file_data/tinhthanh_new.geojson"),
  d3.csv("file_data/liet_si_tinh_thanh.csv"),
])
  .then(function (data) {
    const geojsonData = data[0];
    const csvData = data[1];

    // 1. Chuẩn bị dữ liệu CSV để join
    // Tạo một đối tượng Map để tra cứu nhanh số liệu
    // Key: Tên tỉnh, Value: Số liệt sĩ
    const dataMap = new Map();
    csvData.forEach((row) => {
      // Chuyển "Số liệt sĩ" từ text (string) sang số (number)
      dataMap.set(row["Địa phương"], +row["Số liệt sĩ"]);
    });

    // 2. Gắn dữ liệu CSV vào GeoJSON
    geojsonData.features.forEach((feature) => {
      const tenTinh = feature.properties.ten_tinh;
      const soLietSi = dataMap.get(tenTinh);

      // Thêm số liệu vào thuộc tính của bản đồ
      feature.properties.so_liet_si = soLietSi || 0; // Gán 0 nếu không tìm thấy
    });

    // 3. Hàm định nghĩa màu sắc (Choropleth)
    // Dựa trên số lượng liệt sĩ để trả về mã màu
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
    function highlightFeature(e) {
      const layer = e.target;
      layer.setStyle({
        weight: 1,
        color: "#666",
        dashArray: "",
        fillOpacity: 1,
      });
      info.update(layer.feature.properties); // Cập nhật hộp thông tin
    }

    function resetHighlight(e) {
      geojsonLayer.resetStyle(e.target);
      info.update(); // Xóa thông tin
    }

    // Thêm popup và các sự kiện
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
      });

      // Tạo popup hiển thị thông tin
      const tenTinh = feature.properties.ten_tinh;
      const soLieu = feature.properties.so_liet_si.toLocaleString("vi-VN");
      layer.bindPopup(
        `<b>${tenTinh}</b><br>Số liệt sĩ: ${
          soLieu > 0 ? soLieu : "Không có dữ liệu"
        }`
      );
    }

    // 6. Vẽ lớp bản đồ GeoJSON
    const geojsonLayer = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: onEachFeature,
    }).addTo(map);

    // 7. Thêm hộp thông tin (Info Control)
    const info = L.control();
    info.onAdd = function (map) {
      this._div = L.DomUtil.create("div", "info"); // Tạo div với class 'info'
      this.update();
      return this._div;
    };

    // // Cập nhật hộp thông tin
    // info.update = function (props) {
    //   this._div.innerHTML =
    //     "<h4>Số liệu Liệt sỹ theo Tỉnh</h4>" +
    //     (props
    //       ? `<b>${props.ten_tinh}</b><br>${props.so_liet_si.toLocaleString(
    //           "vi-VN"
    //         )} liệt sỹ`
    //       : "Di chuột qua một tỉnh");
    // };
    // info.addTo(map);

    // 8. Thêm Chú giải (Legend Control)
    const legend = L.control({ position: "topright" });
    legend.onAdd = function (map) {
      const div = L.DomUtil.create("div", "info legend");
      const grades = [0, 5000, 10000, 20000, 30000, 50000, 70000, 80000];
      div.innerHTML += "<b>Số lượng (người)</b><br>";

      // Loop qua các khoảng số liệu và tạo nhãn màu
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
    legend.addTo(map);
  })
  .catch(function (error) {
    console.log("Lỗi khi tải dữ liệu:", error);
  });

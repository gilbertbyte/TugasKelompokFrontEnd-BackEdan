$(function () {

  $.get("/admin/auth/me", function (res) {
    if (res.loggedIn) $("#whoami").text("Halo, " + res.username);
  });

  $("#logoutBtn").on("click", function () {
    $.post("/admin/auth/logout", function (res) {
      window.location.href = res.redirect || "/admin/login";
    });
  });

  function handleAuthFail(xhr) {
    if (xhr.status === 401) window.location.href = "/admin/login";
  }

  $(".tab-btn").on("click", function () {
    var tab = $(this).data("tab");
    $(".tab-btn").removeClass("active");
    $(this).addClass("active");
    $(".tab-panel").removeClass("active");
    $("#tab-" + tab).addClass("active");
  });

  var CONTENT_KEYS = [
    "hero", "toko_populer", "menu_section", "about", "history",
    "testimonial_section", "cari_toko", "faq_section", "contact",
    "footer", "site",
  ];

  function loadContentForm(key) {
    var $form = $("#form-" + key);
    if (!$form.length) return;

    $.get("/admin/api/content/" + key)
      .done(function (data) {
        $form.find("[data-field]").each(function () {
          var field = $(this).data("field");
          $(this).val(data[field] !== undefined ? data[field] : "");
        });
      })
      .fail(handleAuthFail);
  }

  CONTENT_KEYS.forEach(loadContentForm);

  $(".content-form").on("submit", function (e) {
    e.preventDefault();
    var $form = $(this);
    var key = $form.attr("id").replace("form-", "");
    var payload = {};

    $form.find("[data-field]").each(function () {
      payload[$(this).data("field")] = $(this).val();
    });

    var $status = $form.find(".save-status");
    $status.text("Menyimpan...");

    $.ajax({
      url: "/admin/api/content/" + key,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function () {
        $status.text("Tersimpan ✓");
        setTimeout(function () { $status.text(""); }, 2000);
      })
      .fail(function (xhr) {
        handleAuthFail(xhr);
        $status.text("Gagal menyimpan.");
      });
  });

  var LIST_CONFIG = {
    stores: {
      title: "Toko",
      endpoint: "stores",
      columns: ["nama", "alamat", "jarak", "jam_buka", "status", "rating", "ulasan_count"],
      fields: [
        { name: "nama", label: "Nama Toko", type: "text", required: true },
        { name: "alamat", label: "Alamat", type: "text" },
        { name: "jarak", label: "Jarak (contoh: 1.2 km)", type: "text" },
        { name: "jam_buka", label: "Jam Buka", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Buka", "Tutup"] },
        { name: "rating", label: "Rating", type: "number", step: "0.1", min: "0", max: "5" },
        { name: "ulasan_count", label: "Jumlah Ulasan", type: "number", min: "0" },
        { name: "image_url", label: "Gambar Toko", type: "image" },
      ],
    },
    menu: {
      title: "Menu",
      endpoint: "menu",
      columns: ["nama", "deskripsi", "harga"],
      fields: [
        { name: "nama", label: "Nama Menu", type: "text", required: true },
        { name: "deskripsi", label: "Deskripsi", type: "text" },
        { name: "harga", label: "Harga (contoh: Rp 15.000)", type: "text" },
        { name: "image_url", label: "Gambar Menu", type: "image" },
      ],
    },
    testimonials: {
      title: "Testimoni",
      endpoint: "testimonials",
      columns: ["nama", "ulasan", "waktu", "stars"],
      fields: [
        { name: "nama", label: "Nama", type: "text", required: true },
        { name: "ulasan", label: "Ulasan", type: "textarea" },
        { name: "waktu", label: "Keterangan Waktu (contoh: 2 hari yang lalu)", type: "text" },
        { name: "stars", label: "Jumlah Bintang (1-5)", type: "number", min: "1", max: "5" },
      ],
    },
    faqs: {
      title: "Pertanyaan",
      endpoint: "faqs",
      columns: ["question", "answer"],
      fields: [
        { name: "question", label: "Pertanyaan", type: "text", required: true },
        { name: "answer", label: "Jawaban", type: "textarea" },
      ],
    },
  };

  function escapeHtml(str) {
    return $("<div>").text(str == null ? "" : str).html();
  }

  function loadList(listKey) {
    var config = LIST_CONFIG[listKey];
    $.get("/admin/api/" + config.endpoint)
      .done(function (items) { renderListTable(listKey, items); })
      .fail(handleAuthFail);
  }

  function renderListTable(listKey, items) {
    var config = LIST_CONFIG[listKey];
    var $tbody = $('[data-list-table="' + listKey + '"] tbody').empty();

    if (!items.length) {
      $tbody.append(
        '<tr><td colspan="' + (config.columns.length + 1) + '" style="color:#5B6B62;">Belum ada data.</td></tr>'
      );
      return;
    }

    items.forEach(function (item) {
      var cells = config.columns
        .map(function (col) {
          var val = item[col];
          if (col === "status") {
            var cls = val === "Buka" ? "buka" : "tutup";
            return '<td><span class="status-tag ' + cls + '">' + escapeHtml(val) + "</span></td>";
          }
          return "<td>" + escapeHtml(truncate(val)) + "</td>";
        })
        .join("");

      var $row = $(
        "<tr>" + cells +
          '<td class="row-actions">' +
            '<button class="edit-btn" data-list="' + listKey + '" data-id="' + item.id + '">Edit</button>' +
            '<button class="delete-btn" data-list="' + listKey + '" data-id="' + item.id + '">Hapus</button>' +
          "</td>" +
        "</tr>"
      );
      $row.data("item", item);
      $tbody.append($row);
    });
  }

  function truncate(val) {
    if (val == null) return "-";
    var str = String(val);
    return str.length > 60 ? str.slice(0, 60) + "…" : str;
  }

  Object.keys(LIST_CONFIG).forEach(loadList);

  function buildModalFields(listKey, item) {
    var config = LIST_CONFIG[listKey];
    var $container = $("#itemFormFields").empty();

    config.fields.forEach(function (f) {
      var value = item ? item[f.name] : "";
      var $label = $("<label>").text(f.label);
      var $input;

      if (f.type === "image") {
        var $hidden = $("<input>").attr("type", "hidden").attr("data-field", f.name).val(value || "");
        var $preview = $("<img>")
          .css({ maxWidth: "160px", display: value ? "block" : "none", marginBottom: "8px", borderRadius: "8px" })
          .attr("src", value || "");
        var $fileInput = $("<input>").attr("type", "file").attr("accept", "image/jpeg,image/png,image/webp");
        var $status = $("<span>").css({ fontSize: "0.8rem", color: "#5B6B62", marginLeft: "8px" });

        $fileInput.on("change", function () {
          var file = this.files[0];
          if (!file) return;
          var formData = new FormData();
          formData.append("image", file);
          $status.text("Mengupload...");

          $.ajax({
            url: "/admin/api/upload",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
          })
            .done(function (res) {
              $hidden.val(res.url);
              $preview.attr("src", res.url).show();
              $status.text("Berhasil ✓");
              setTimeout(function () { $status.text(""); }, 2000);
            })
            .fail(function () {
              $status.text("Gagal upload.");
            });
        });

        $container.append($label).append($preview).append($fileInput).append($status).append($hidden);
        return;
      }

      if (f.type === "textarea") {
        $input = $("<textarea>").attr("rows", 3).attr("data-field", f.name).val(value || "");
      } else if (f.type === "select") {
        $input = $("<select>").attr("data-field", f.name);
        f.options.forEach(function (opt) {
          $input.append($("<option>").val(opt).text(opt));
        });
        $input.val(value || f.options[0]);
      } else {
        $input = $("<input>").attr("type", f.type).attr("data-field", f.name);
        if (f.step) $input.attr("step", f.step);
        if (f.min !== undefined) $input.attr("min", f.min);
        if (f.max !== undefined) $input.attr("max", f.max);
        if (f.required) $input.attr("required", true);
        $input.val(value !== undefined && value !== null ? value : "");
      }

      $container.append($label).append($input);
    });
  }

  function openItemModal(listKey, item) {
    var config = LIST_CONFIG[listKey];
    $("#itemModalTitle").text((item ? "Edit " : "Tambah ") + config.title);
    $("#itemId").val(item ? item.id : "");
    $("#itemListKey").val(listKey);
    buildModalFields(listKey, item);
    $("#itemModal").addClass("open");
  }

  function closeItemModal() {
    $("#itemModal").removeClass("open");
    $("#itemFormFields").empty();
  }

  $(document).on("click", ".add-item-btn", function () {
    openItemModal($(this).data("list"), null);
  });

  $("#cancelItemModalBtn").on("click", closeItemModal);
  $("#itemModal").on("click", function (e) {
    if (e.target === this) closeItemModal();
  });

  $(document).on("click", ".edit-btn", function () {
    var listKey = $(this).data("list");
    var item = $(this).closest("tr").data("item");
    openItemModal(listKey, item);
  });

  $(document).on("click", ".delete-btn", function () {
    var listKey = $(this).data("list");
    var id = $(this).data("id");
    var config = LIST_CONFIG[listKey];

    if (!confirm("Hapus item ini?")) return;

    $.ajax({ url: "/admin/api/" + config.endpoint + "/" + id, method: "DELETE" })
      .done(function () { loadList(listKey); })
      .fail(function (xhr) {
        handleAuthFail(xhr);
        alert("Gagal menghapus.");
      });
  });

  $("#itemForm").on("submit", function (e) {
    e.preventDefault();

    var listKey = $("#itemListKey").val();
    var id = $("#itemId").val();
    var config = LIST_CONFIG[listKey];

    var payload = {};
    $("#itemFormFields [data-field]").each(function () {
      payload[$(this).data("field")] = $(this).val();
    });

    var req = id
      ? $.ajax({
          url: "/admin/api/" + config.endpoint + "/" + id,
          method: "PUT",
          contentType: "application/json",
          data: JSON.stringify(payload),
        })
      : $.ajax({
          url: "/admin/api/" + config.endpoint,
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(payload),
        });

    req
      .done(function () {
        closeItemModal();
        loadList(listKey);
      })
      .fail(function (xhr) {
        handleAuthFail(xhr);
        alert("Gagal menyimpan.");
      });
  });

});
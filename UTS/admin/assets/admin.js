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

  function parseImageList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string" || !value) return [];
    try {
      var parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {}
    return [value];
  }

  function timeToMinutes(value) {
    var match = String(value || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function storeIsOpen(store) {
    var opening = timeToMinutes(store.jam_buka);
    var closing = timeToMinutes(store.jam_tutup);
    if (opening === null || closing === null || opening === closing) return false;
    var now = new Date();
    var current = now.getHours() * 60 + now.getMinutes();
    return opening < closing
      ? current >= opening && current < closing
      : current >= opening || current < closing;
  }

  function formatTime(value) {
    var minutes = timeToMinutes(value);
    if (minutes === null) return "-";
    var date = new Date();
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function buildImageManager($container, fieldName, value, $field) {
    var images = parseImageList(value);
    var currentIndex = 0;
    var $manager = $("<div>").addClass("image-manager");
    var $viewer = $("<div>").addClass("image-manager-viewer");
    var $image = $("<img>").attr("alt", "Pratinjau gambar");
    var $previous = $("<button>").attr({ type: "button", "aria-label": "Gambar sebelumnya" })
      .addClass("image-manager-arrow image-manager-prev").text("‹");
    var $next = $("<button>").attr({ type: "button", "aria-label": "Gambar berikutnya" })
      .addClass("image-manager-arrow image-manager-next").text("›");
    var $counter = $("<span>").addClass("image-manager-counter");
    var $empty = $("<p>").addClass("image-manager-empty").text("Belum ada gambar.");
    var $remove = $("<button>").attr("type", "button").addClass("btn-secondary image-manager-remove").text("Hapus gambar ini");
    var $fileInput = $("<input>").attr({
      type: "file",
      accept: "image/jpeg,image/png,image/webp",
      multiple: true,
      "aria-label": "Tambah gambar",
    });
    var $status = $("<span>").addClass("image-manager-status");

    if (!$field || !$field.length) {
      $field = $("<input>").attr({ type: "hidden", "data-field": fieldName });
    }

    function update(notify) {
      currentIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
      $field.val(JSON.stringify(images));
      if (notify) $field.trigger("input");
      $viewer.toggle(images.length > 0);
      $empty.toggle(images.length === 0);
      $image.attr("src", images[currentIndex] || "");
      $counter.text(images.length ? (currentIndex + 1) + " / " + images.length : "");
      $previous.toggle(images.length > 1);
      $next.toggle(images.length > 1);
      $counter.toggle(images.length > 1);
      $remove.toggle(images.length > 0);
    }

    $previous.on("click", function () {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      update();
    });
    $next.on("click", function () {
      currentIndex = (currentIndex + 1) % images.length;
      update();
    });
    $remove.on("click", function () {
      images.splice(currentIndex, 1);
      update(true);
    });
    $fileInput.on("change", function () {
      var files = Array.prototype.slice.call(this.files || []);
      var input = this;
      var fileIndex = 0;
      var failedCount = 0;
      if (!files.length) return;
      input.value = "";
      input.disabled = true;
      var $submit = $container.closest("form").find(":submit").prop("disabled", true);

      function uploadNext() {
        if (fileIndex >= files.length) {
          input.disabled = false;
          $submit.prop("disabled", false);
          $status.text(failedCount ? failedCount + " upload gagal." : "Selesai: " + images.length + " gambar.");
          update(true);
          return;
        }
        var file = files[fileIndex++];
        var formData = new FormData();
        formData.append("image", file);
        $status.text("Mengupload " + fileIndex + " dari " + files.length + "...");
        $.ajax({
          url: "/admin/api/upload",
          method: "POST",
          data: formData,
          processData: false,
          contentType: false,
        })
          .done(function (res) { images.push(res.url); })
          .fail(function () {
            failedCount++;
            $status.text("Gagal upload: " + file.name);
          })
          .always(uploadNext);
      }

      uploadNext();
    });

    $viewer.append($image, $previous, $next, $counter);
    $manager.append($viewer, $empty, $remove);
    var $addRow = $("<div>").addClass("image-manager-add-row")
      .append($fileInput, $status);
    $manager.append($addRow);
    $container.empty().append($manager);
    if (!$field.parent().is($container)) $container.append($field);
    update();
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
        if (key === "about") {
          buildImageManager($("#aboutImageManager"), "images", data.images || data.image_url, $("#aboutImagesField"));
        }
        renderContentPreview(key);
      })
      .fail(handleAuthFail);
  }

  CONTENT_KEYS.forEach(loadContentForm);

  function renderContentPreview(key) {
    var $form = $("#form-" + key);
    var $preview = $("#preview-" + key);
    if (!$form.length || !$preview.length) return;

    function value(field) {
      var current = $form.find('[data-field="' + field + '"]').val();
      return escapeHtml(current == null ? "" : current);
    }

    var html = "";
    if (key === "hero") {
      html = '<span class="pv-badge">' + value("badge") + '</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<p class="pv-sub">' + value("subheading") + '</p>' +
        '<div class="pv-search">' + value("search_placeholder") + '</div>' +
        '<div class="pv-actions"><span class="pv-btn pv-btn-mustard">' + value("cta_primary") + '</span>' +
        '<span class="pv-btn pv-btn-outline">' + value("cta_secondary") + '</span></div>';
    } else if (key === "toko_populer") {
      html = '<span class="pv-eyebrow mustard">TOKO PILIHAN</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<p class="pv-sub">' + value("subheading") + '</p>' +
        '<div class="pv-card"><h4>Es Pisang Ijo</h4><p>Jam buka dan rating toko</p></div>' +
        '<p style="margin:10px 0 0"><span class="pv-link">' + value("link_text") + '</span></p>';
    } else if (key === "menu_section") {
      html = '<span class="pv-eyebrow mustard">MENU</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<p class="pv-sub">' + value("subheading") + '</p>' +
        '<div class="pv-card"><h4>Pisang Ijo Original</h4><p>Deskripsi menu</p><div class="pv-row"><span class="pv-price">Rp 15.000</span></div></div>';
    } else if (key === "about") {
      var images = parseImageList($form.find('[data-field="images"]').val());
      var media = images.length
        ? '<div class="pv-slideshow">' + images.map(function (image, index) {
            return '<img class="pv-img' + (index === 0 ? ' active' : '') + '" src="' + escapeHtml(image) + '" alt="Tentang platform">';
          }).join("") + (images.length > 1
            ? '<button class="pv-slide-arrow pv-slide-prev" type="button" data-direction="-1" aria-label="Gambar sebelumnya">‹</button>' +
              '<button class="pv-slide-arrow pv-slide-next" type="button" data-direction="1" aria-label="Gambar berikutnya">›</button>' +
              '<span class="pv-slide-counter">1 / ' + images.length + '</span>'
            : '') + '</div>'
        : '<div class="pv-img-placeholder">' + value("media_text") + '</div>';
      html = media + '<span class="pv-eyebrow">' + value("eyebrow") + '</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<p class="pv-sub">' + value("description") + '</p>' +
        '<div class="pv-pill-row"><span class="pv-pill">' + value("pill_1") + '</span>' +
        '<span class="pv-pill">' + value("pill_2") + '</span><span class="pv-pill">' + value("pill_3") + '</span></div>';
    } else if (key === "history") {
      html = '<div class="pv-dark-box"><h2 class="pv-heading">' + value("heading") + '</h2><p>' + value("text") + '</p></div>';
    } else if (key === "testimonial_section") {
      html = '<span class="pv-eyebrow mustard">' + value("eyebrow") + '</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<div class="pv-card"><div class="pv-stars">★★★★★</div><p>Ulasan pelanggan tampil di sini.</p></div>' +
        '<p style="margin:10px 0 0"><span class="pv-btn pv-btn-mustard">' + value("cta") + '</span></p>';
    } else if (key === "cari_toko") {
      html = '<span class="pv-eyebrow">' + value("eyebrow") + '</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<p class="pv-sub">' + value("subheading") + '</p>' +
        '<div class="pv-search">Cari toko atau menu</div><div class="pv-actions"><span class="pv-btn pv-btn-mustard">Cari Toko</span></div>';
    } else if (key === "faq_section") {
      html = '<span class="pv-eyebrow">' + value("eyebrow") + '</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2>' +
        '<div class="pv-faq-item"><div class="q">Pertanyaan pelanggan</div><div class="a">Jawaban ditampilkan di sini.</div></div>';
    } else if (key === "contact") {
      html = '<div class="pv-dark-box"><span class="pv-eyebrow mustard">' + value("eyebrow") + '</span>' +
        '<h2 class="pv-heading">' + value("heading") + '</h2><p>' + value("note") + '</p>' +
        '<p style="margin-top:10px">' + value("email") + '<br>' + value("whatsapp") + '<br>' + value("hours") + '</p></div>';
    } else if (key === "footer") {
      html = '<div class="pv-footer-mock"><strong>' + value("tagline") + '</strong>' +
        '<p>' + value("social_text") + '</p><p>' + value("help_email") + ' · ' + value("help_whatsapp") + '</p>' +
        '<p>' + value("legal_terms_label") + ' · ' + value("legal_privacy_label") + '</p>' +
        '<p>' + value("copyright") + '</p></div>';
    } else if (key === "site") {
      html = '<div class="pv-browser-tab"><span class="dot"></span><span class="dot"></span><span class="dot"></span>' +
        '<span>' + value("site_title") + '</span></div>' +
        '<div class="pv-footer-mock"><strong>' + value("logo_text") + '</strong><p>Header and footer branding</p></div>';
    }

    $preview.html(html);
  }

  $(".content-form").on("input change", "[data-field]", function () {
    renderContentPreview($(this).closest("form").attr("id").replace("form-", ""));
  });

  $(document).on("click", ".pv-slide-arrow", function () {
    var $slideshow = $(this).closest(".pv-slideshow");
    var $slides = $slideshow.find(".pv-img");
    var activeIndex = $slides.index($slides.filter(".active"));
    var nextIndex = (activeIndex + Number($(this).data("direction")) + $slides.length) % $slides.length;
    $slides.removeClass("active").eq(nextIndex).addClass("active");
    $slideshow.find(".pv-slide-counter").text((nextIndex + 1) + " / " + $slides.length);
  });

  $(".content-form").on("submit", function (e) {
    e.preventDefault();
    var $form = $(this);
    var key = $form.attr("id").replace("form-", "");
    var payload = {};

    $form.find("[data-field]").each(function () {
      var field = $(this).data("field");
      var value = $(this).val();
      payload[field] = field === "images" ? parseImageList(value) : value;
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

  var STORES_CACHE = [];

  function loadStoresCache() {
    return $.get("/admin/api/stores").done(function (stores) {
      STORES_CACHE = stores;
    });
  }
  loadStoresCache();

  var LIST_CONFIG = {
    stores: {
      title: "Toko",
      endpoint: "stores",
      columns: ["image_url", "nama", "alamat", "jam_buka", "status", "rating", "ulasan_count"],
      fields: [
        { name: "nama", label: "Nama Toko", type: "text", required: true },
        { name: "alamat", label: "Alamat", type: "text" },
        { name: "jam_buka", label: "Jam Buka", type: "time", required: true },
        { name: "jam_tutup", label: "Jam Tutup", type: "time", required: true },
        { name: "rating", label: "Rating", type: "number", step: "0.1", min: "0", max: "5" },
        { name: "ulasan_count", label: "Jumlah Ulasan", type: "number", min: "0" },
        { name: "image_url", label: "Gambar Toko (pilih satu atau lebih)", type: "image" },
      ],
    },
    menu: {
      title: "Menu",
      endpoint: "menu",
      columns: ["image_url", "nama", "deskripsi", "harga", "store_id"],
      fields: [
        { name: "nama", label: "Nama Menu", type: "text", required: true },
        { name: "deskripsi", label: "Deskripsi", type: "text" },
        { name: "harga", label: "Harga (contoh: Rp 15.000)", type: "text" },
        { name: "image_url", label: "Gambar Menu (pilih satu atau lebih)", type: "image" },
        { name: "store_id", label: "Toko", type: "store-select" },
      ],
    },
    testimonials: {
      title: "Testimoni",
      endpoint: "testimonials",
      columns: ["nama", "ulasan", "waktu", "stars", "approved"],
      fields: [
        { name: "nama", label: "Nama", type: "text", required: true },
        { name: "ulasan", label: "Ulasan", type: "textarea" },
        { name: "waktu", label: "Keterangan Waktu (contoh: 2 hari yang lalu)", type: "text" },
        { name: "stars", label: "Jumlah Bintang (1-5)", type: "number", min: "1", max: "5" },
        {
          name: "approved",
          label: "Status Approval",
          type: "select",
          options: ["0", "1"],
          optionLabels: { "0": "Menunggu Approval", "1": "Disetujui" },
        },
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
            var label = storeIsOpen(item) ? "Buka" : "Tutup";
            var cls = label === "Buka" ? "buka" : "tutup";
            return '<td><span class="status-tag ' + cls + '">' + label + "</span></td>";
          }
          if (col === "jam_buka") {
            return "<td>" + escapeHtml(formatTime(item.jam_buka) + " - " + formatTime(item.jam_tutup)) + "</td>";
          }
          if (col === "approved") {
            var isApproved = Number(val) === 1;
            var bg = isApproved ? "#E9F1EA" : "#FCEBD1";
            var fg = isApproved ? "#1E4D3B" : "#C9852A";
            var label = isApproved ? "Disetujui" : "Menunggu";
            return (
              '<td><span style="background:' + bg + ";color:" + fg +
              ';padding:4px 10px;border-radius:999px;font-size:0.78rem;font-weight:600;">' +
              label +
              "</span></td>"
            );
          }
          if (col === "store_id") {
            var store = STORES_CACHE.find(function (s) { return s.id == val; });
            return "<td>" + (store ? escapeHtml(store.nama) : "<em>Belum dipilih</em>") + "</td>";
          }
          if (col === "image_url") {
            var images = parseImageList(val);
            return images.length
              ? '<td><div style="position:relative;width:48px;height:48px;"><img src="' + escapeHtml(images[0]) + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">' +
                (images.length > 1 ? '<span class="image-count-badge">' + images.length + '</span>' : '') + '</div></td>'
              : '<td style="color:#5B6B62;font-size:0.8rem;">Belum ada</td>';
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
  window.setInterval(function () { loadList("stores"); }, 60000);

  function buildModalFields(listKey, item) {
    var config = LIST_CONFIG[listKey];
    var $container = $("#itemFormFields").empty();

    config.fields.forEach(function (f) {
      var value = item ? item[f.name] : "";
      var $label = $("<label>").text(f.label);
      var $input;

      if (f.type === "image") {
        var $imageManager = $("<div>");
        var $hidden = $("<input>").attr("type", "hidden").attr("data-field", f.name);
        buildImageManager($imageManager, f.name, value, $hidden);
        $container.append($label).append($imageManager);
        return;
      }

      if (f.type === "textarea") {
        $input = $("<textarea>").attr("rows", 3).attr("data-field", f.name).val(value || "");
      } else if (f.type === "store-select") {
        $input = $("<select>").attr("data-field", f.name);
        $input.append($("<option>").val("").text("— Pilih Toko —"));
        STORES_CACHE.forEach(function (store) {
          $input.append($("<option>").val(store.id).text(store.nama));
        });
        $input.val(value || "");
      } else if (f.type === "select") {
        $input = $("<select>").attr("data-field", f.name);
        f.options.forEach(function (opt) {
          var label = (f.optionLabels && f.optionLabels[opt]) || opt;
          $input.append($("<option>").val(opt).text(label));
        });
        $input.val(value !== undefined && value !== null ? String(value) : f.options[0]);
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
      var field = $(this).data("field");
      var value = $(this).val();
      payload[field] = field === "image_url" ? parseImageList(value) : value;
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
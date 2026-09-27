$(function () {

  /* ================================================================ */
  /* Auth: who am I / logout                                           */
  /* ================================================================ */

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

  function escapeHtml(str) {
    return $("<div>").text(str == null ? "" : str).html();
  }

  /* ================================================================ */
  /* Tab navigation                                                     */
  /* ================================================================ */

  $(".tab-btn").on("click", function () {
    var tab = $(this).data("tab");
    $(".tab-btn").removeClass("active");
    $(this).addClass("active");
    $(".tab-panel").removeClass("active");
    $("#tab-" + tab).addClass("active");
  });

  /* ================================================================ */
  /* Live preview renderers for content-block forms                    */
  /* ================================================================ */

  var CONTENT_PREVIEW_RENDERERS = {
    hero: function (v) {
      return (
        '<span class="pv-badge">' + escapeHtml(v.badge || "Badge") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "Judul hero") + "</h3>" +
        '<p class="pv-sub">' + escapeHtml(v.subheading || "") + "</p>" +
        '<div class="pv-search">' + escapeHtml(v.search_placeholder || "Cari...") + "</div>" +
        '<div class="pv-actions">' +
          '<span class="pv-btn pv-btn-mustard">' + escapeHtml(v.cta_primary || "Tombol 1") + "</span>" +
          '<span class="pv-btn pv-btn-outline">' + escapeHtml(v.cta_secondary || "Tombol 2") + "</span>" +
        "</div>"
      );
    },
    toko_populer: function (v) {
      return (
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
        '<p class="pv-sub">' + escapeHtml(v.subheading || "") + "</p>" +
        '<span class="pv-link">' + escapeHtml(v.link_text || "") + " →</span>"
      );
    },
    menu_section: function (v) {
      return (
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
        '<p class="pv-sub">' + escapeHtml(v.subheading || "") + "</p>"
      );
    },
    about: function (v) {
      var img = v.image_url
        ? '<img class="pv-img" src="' + escapeHtml(v.image_url) + '">'
        : '<div class="pv-img-placeholder">' + escapeHtml(v.media_text || "Placeholder gambar") + "</div>";
      return (
        img +
        '<span class="pv-eyebrow">' + escapeHtml(v.eyebrow || "") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
        '<p class="pv-sub">' + escapeHtml(v.description || "") + "</p>" +
        '<div class="pv-pill-row">' +
          '<span class="pv-pill">' + escapeHtml(v.pill_1 || "") + "</span>" +
          '<span class="pv-pill">' + escapeHtml(v.pill_2 || "") + "</span>" +
          '<span class="pv-pill">' + escapeHtml(v.pill_3 || "") + "</span>" +
        "</div>"
      );
    },
    history: function (v) {
      return (
        '<div class="pv-dark-box">' +
          '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
          "<p>" + escapeHtml(v.text || "") + "</p>" +
        "</div>"
      );
    },
    testimonial_section: function (v) {
      return (
        '<span class="pv-eyebrow mustard">' + escapeHtml(v.eyebrow || "") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
        '<span class="pv-btn pv-btn-mustard">' + escapeHtml(v.cta || "") + "</span>"
      );
    },
    cari_toko: function (v) {
      return (
        '<span class="pv-eyebrow mustard">' + escapeHtml(v.eyebrow || "") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
        '<p class="pv-sub">' + escapeHtml(v.subheading || "") + "</p>"
      );
    },
    faq_section: function (v) {
      return (
        '<span class="pv-eyebrow mustard">' + escapeHtml(v.eyebrow || "") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>"
      );
    },
    contact: function (v) {
      return (
        '<span class="pv-eyebrow mustard">' + escapeHtml(v.eyebrow || "") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "") + "</h3>" +
        '<div class="pv-card">' +
          "<p>Email: " + escapeHtml(v.email || "") + "</p>" +
          "<p>WhatsApp: " + escapeHtml(v.whatsapp || "") + "</p>" +
          "<p>" + escapeHtml(v.note || "") + "</p>" +
          "<p><strong>Jam:</strong> " + escapeHtml(v.hours || "") + "</p>" +
        "</div>"
      );
    },
    footer: function (v) {
      return (
        '<div class="pv-footer-mock">' +
          "<strong>Pisang Ijo</strong>" +
          escapeHtml(v.tagline || "") + "<br>" +
          escapeHtml(v.social_text || "") + "<br><br>" +
          escapeHtml(v.help_email || "") + "<br>" +
          escapeHtml(v.help_whatsapp || "") + "<br><br>" +
          escapeHtml(v.legal_terms_label || "") + " · " + escapeHtml(v.legal_privacy_label || "") + "<br><br>" +
          "© " + escapeHtml(v.copyright || "") +
        "</div>"
      );
    },
    site: function (v) {
      return (
        '<div class="pv-browser-tab"><span class="dot"></span><span class="dot"></span>' +
          escapeHtml(v.site_title || "Judul Situs") +
        "</div>" +
        '<div class="pv-card" style="border-radius:0 0 8px 8px;margin-top:-1px;">' +
          "<p style='font-weight:700;color:var(--green-deep);font-size:1rem;'>" + escapeHtml(v.logo_text || "Logo") + "</p>" +
          "<p style='margin:0;'>Tampil di header &amp; footer situs.</p>" +
        "</div>"
      );
    },
  };

  var CONTENT_KEYS = Object.keys(CONTENT_PREVIEW_RENDERERS);

  function collectFormValues($form) {
    var values = {};
    $form.find("[data-field]").each(function () {
      values[$(this).data("field")] = $(this).val();
    });
    return values;
  }

  function updateContentPreview(key) {
    var $form = $("#form-" + key);
    var $preview = $("#preview-" + key);
    if (!$form.length || !$preview.length) return;

    var renderer = CONTENT_PREVIEW_RENDERERS[key];
    if (!renderer) return;

    var values = collectFormValues($form);
    $preview.html(renderer(values));
  }

  function loadContentForm(key) {
    var $form = $("#form-" + key);
    if (!$form.length) return;

    $.get("/admin/api/content/" + key)
      .done(function (data) {
        $form.find("[data-field]").each(function () {
          var field = $(this).data("field");
          $(this).val(data[field] !== undefined ? data[field] : "");
        });
        if (key === "about" && data.image_url) {
          $("#aboutImagePreview").attr("src", data.image_url).show();
        }
        updateContentPreview(key);
      })
      .fail(handleAuthFail);
  }

  CONTENT_KEYS.forEach(loadContentForm);

  // Live-update the preview as the admin types, before saving.
  $(".content-form").on("input change", "[data-field]", function () {
    var key = $(this).closest(".content-form").attr("id").replace("form-", "");
    updateContentPreview(key);
  });

  $(".content-form").on("submit", function (e) {
    e.preventDefault();
    var $form = $(this);
    var key = $form.attr("id").replace("form-", "");
    var payload = collectFormValues($form);

    var $status = $form.find(".save-status");
    $status.removeClass("err").text("Menyimpan...");

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
        $status.addClass("err").text("Gagal menyimpan.");
      });
  });

  /* ================================================================ */
  /* Stores cache (used for store-select dropdown + menu preview)      */
  /* ================================================================ */

  var STORES_CACHE = [];

  function loadStoresCache() {
    return $.get("/admin/api/stores").done(function (stores) {
      STORES_CACHE = stores;
    });
  }
  loadStoresCache();

  /* ================================================================ */
  /* Generic list CRUD (stores, menu, testimonials, faqs)               */
  /* ================================================================ */

  var LIST_CONFIG = {
    stores: {
      title: "Toko",
      endpoint: "stores",
      columns: ["image_url", "nama", "alamat", "jarak", "jam_buka", "status", "rating", "ulasan_count"],
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
      preview: function (v) {
        var img = v.image_url
          ? '<img class="pv-img" src="' + escapeHtml(v.image_url) + '">'
          : '<div class="pv-img-placeholder">Belum ada gambar</div>';
        var buka = v.status !== "Tutup";
        return (
          img +
          '<div class="pv-card">' +
            "<h4>" + escapeHtml(v.nama || "Nama Toko") + "</h4>" +
            "<p>" + escapeHtml(v.alamat || "") + "</p>" +
            "<p>" + escapeHtml(v.jarak || "") + " &middot; " + escapeHtml(v.jam_buka || "") + "</p>" +
            '<div class="pv-row">' +
              '<span class="pv-status ' + (buka ? "buka" : "tutup") + '">' + escapeHtml(v.status || "Buka") + "</span>" +
              "<span>★ " + (v.rating || 0) + " (" + (v.ulasan_count || 0) + ")</span>" +
            "</div>" +
          "</div>"
        );
      },
    },
    menu: {
      title: "Menu",
      endpoint: "menu",
      columns: ["image_url", "nama", "deskripsi", "harga", "store_id"],
      fields: [
        { name: "nama", label: "Nama Menu", type: "text", required: true },
        { name: "deskripsi", label: "Deskripsi", type: "text" },
        { name: "harga", label: "Harga (contoh: Rp 15.000)", type: "text" },
        { name: "image_url", label: "Gambar Menu", type: "image" },
        { name: "store_id", label: "Toko", type: "store-select" },
      ],
      preview: function (v) {
        var img = v.image_url
          ? '<img class="pv-img" src="' + escapeHtml(v.image_url) + '">'
          : '<div class="pv-img-placeholder">Belum ada gambar</div>';
        var store = STORES_CACHE.find(function (s) { return String(s.id) === String(v.store_id); });
        return (
          img +
          '<div class="pv-card">' +
            "<h4>" + escapeHtml(v.nama || "Nama Menu") + "</h4>" +
            "<p>" + escapeHtml(v.deskripsi || "") + "</p>" +
            '<div class="pv-row">' +
              '<span class="pv-price">' + escapeHtml(v.harga || "") + "</span>" +
              "<span style='font-size:.75rem;color:var(--text-muted);'>" + (store ? escapeHtml(store.nama) : "Belum dipilih") + "</span>" +
            "</div>" +
          "</div>"
        );
      },
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
      preview: function (v) {
        var stars = Math.max(0, Math.min(5, parseInt(v.stars, 10) || 5));
        return (
          '<div class="pv-card">' +
            '<div class="pv-stars">' + "★".repeat(stars) + "</div>" +
            "<h4>" + escapeHtml(v.nama || "Nama") + "</h4>" +
            "<p>" + escapeHtml(v.ulasan || "") + "</p>" +
            "<p style='font-size:.72rem;'>" + escapeHtml(v.waktu || "") + "</p>" +
          "</div>"
        );
      },
    },
    faqs: {
      title: "Pertanyaan",
      endpoint: "faqs",
      columns: ["question", "answer"],
      fields: [
        { name: "question", label: "Pertanyaan", type: "text", required: true },
        { name: "answer", label: "Jawaban", type: "textarea" },
      ],
      preview: function (v) {
        return (
          '<div class="pv-faq-item">' +
            '<div class="q">' + escapeHtml(v.question || "Pertanyaan") + "</div>" +
            '<div class="a">' + escapeHtml(v.answer || "") + "</div>" +
          "</div>"
        );
      },
    },
  };

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
        '<tr><td colspan="' + (config.columns.length + 1) + '" style="color:#66756C;">Belum ada data.</td></tr>'
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
          if (col === "store_id") {
            var store = STORES_CACHE.find(function (s) { return s.id == val; });
            return "<td>" + (store ? escapeHtml(store.nama) : "<em>Belum dipilih</em>") + "</td>";
          }
          if (col === "image_url") {
            return val
              ? '<td><img src="' + escapeHtml(val) + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px;"></td>'
              : '<td style="color:#66756C;font-size:0.8rem;">Belum ada</td>';
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

  /* ---------- Modal fields + live preview ---------- */

  function collectItemFormValues() {
    var values = {};
    $("#itemFormFields [data-field]").each(function () {
      values[$(this).data("field")] = $(this).val();
    });
    return values;
  }

  function updateItemPreview() {
    var listKey = $("#itemListKey").val();
    var config = LIST_CONFIG[listKey];
    if (!config || !config.preview) return;
    var values = collectItemFormValues();
    $("#itemPreview").html(config.preview(values));
  }

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
        var $status = $("<span>").css({ fontSize: "0.8rem", color: "#66756C", marginLeft: "8px" });

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
              updateItemPreview();
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
    updateItemPreview();
    $("#itemModal").addClass("open");
  }

  function closeItemModal() {
    $("#itemModal").removeClass("open");
    $("#itemFormFields").empty();
    $("#itemPreview").empty();
  }

  // Live-update the modal preview as any field changes.
  $("#itemFormFields").on("input change", "[data-field]", updateItemPreview);

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
    var payload = collectItemFormValues();

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
        if (listKey === "stores") loadStoresCache();
      })
      .fail(function (xhr) {
        handleAuthFail(xhr);
        alert("Gagal menyimpan.");
      });
  });

  /* ---------- About section's dedicated image upload (kept from before) ---------- */

  $("#aboutImageFile").on("change", function () {
    var file = this.files[0];
    if (!file) return;
    var formData = new FormData();
    formData.append("image", file);
    $("#aboutImageStatus").text("Mengupload...");

    $.ajax({
      url: "/admin/api/upload",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
    })
      .done(function (res) {
        $("#aboutImageUrl").val(res.url);
        $("#aboutImagePreview").attr("src", res.url).show();
        $("#aboutImageStatus").text("Berhasil ✓");
        setTimeout(function () { $("#aboutImageStatus").text(""); }, 2000);
        updateContentPreview("about");
      })
      .fail(function () {
        $("#aboutImageStatus").text("Gagal upload.");
      });
  });

});

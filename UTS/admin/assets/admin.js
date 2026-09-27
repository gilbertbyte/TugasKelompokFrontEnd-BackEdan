$(function () {


  $.get("/admin/auth/me", function (res) {
    if (res.loggedIn) $("#whoami").text("Signed in as " + res.username);
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


  function buildImageManager($container, initialImages, onChange) {
    var images = (initialImages || []).slice();
    var currentIndex = 0;

    function uploadSequentially(files, onDone) {
      var idx = 0;
      function next() {
        if (idx >= files.length) return onDone();
        var file = files[idx++];
        var formData = new FormData();
        formData.append("image", file);

        $.ajax({
          url: "/admin/api/upload",
          method: "POST",
          data: formData,
          processData: false,
          contentType: false,
        })
          .done(function (res) {
            images.push(res.url);
            currentIndex = images.length - 1;
            next();
          })
          .fail(function () {
            onDone("One or more files could not be uploaded.");
          });
      }
      next();
    }

    function render() {
      $container.empty();

      if (images.length > 0) {
        if (currentIndex >= images.length) currentIndex = images.length - 1;
        if (currentIndex < 0) currentIndex = 0;

        var $viewer = $('<div class="image-manager-viewer"></div>');
        $viewer.append($("<img>").attr("src", images[currentIndex]));

        if (images.length > 1) {
          var $prev = $('<button type="button" class="image-manager-arrow image-manager-prev">&#8249;</button>');
          var $next = $('<button type="button" class="image-manager-arrow image-manager-next">&#8250;</button>');
          $prev.on("click", function () {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            render();
          });
          $next.on("click", function () {
            currentIndex = (currentIndex + 1) % images.length;
            render();
          });
          $viewer.append($prev).append($next);
          $viewer.append(
            $('<span class="image-manager-counter"></span>').text((currentIndex + 1) + " / " + images.length)
          );
        }
        $container.append($viewer);

        var $removeBtn = $('<button type="button" class="btn-outline image-manager-remove">Remove this image</button>');
        $removeBtn.on("click", function () {
          images.splice(currentIndex, 1);
          onChange(images);
          render();
        });
        $container.append($removeBtn);
      } else {
        $container.append('<p class="image-manager-empty">No images added yet.</p>');
      }

      var $addRow = $('<div class="image-manager-add-row"></div>');
      var $fileInput = $("<input>").attr({
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        multiple: true,
      });
      var $status = $('<span class="image-manager-status"></span>');

      $fileInput.on("change", function () {
        var files = Array.prototype.slice.call(this.files || []);
        if (!files.length) return;
        $status.text("Mengupload...");

        uploadSequentially(files, function (err) {
          onChange(images);
          render();
          if (err) {
            $(".image-manager-status", $container).text(err);
          } else {
            $(".image-manager-status", $container).text("Berhasil ✓");
            setTimeout(function () { $(".image-manager-status", $container).text(""); }, 2000);
          }
        });
      });

      $addRow.append($fileInput).append($status);
      $container.append($addRow);
    }

    render();
    return { getImages: function () { return images; } };
  }


  var SLIDE_STATE = {};
  var SLIDE_IMAGES = {};

  function parseImagesField(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string" || !raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function buildPreviewMediaBlock(slideKey, images, placeholderText) {
    images = (images || []).filter(Boolean);
    SLIDE_IMAGES[slideKey] = images;

    if (images.length === 0) {
      return '<div class="pv-img-placeholder">' + escapeHtml(placeholderText || "No images added yet") + "</div>";
    }

    if (images.length === 1) {
      return '<img class="pv-img" src="' + escapeHtml(images[0]) + '">';
    }

    var idx = SLIDE_STATE[slideKey] || 0;
    if (idx >= images.length) idx = 0;
    SLIDE_STATE[slideKey] = idx;

    return (
      '<div class="pv-slideshow">' +
        '<img class="pv-img" src="' + escapeHtml(images[idx]) + '">' +
        '<button type="button" class="pv-slide-arrow pv-slide-prev" data-slide-key="' + slideKey + '">&#8249;</button>' +
        '<button type="button" class="pv-slide-arrow pv-slide-next" data-slide-key="' + slideKey + '">&#8250;</button>' +
        '<span class="pv-slide-counter">' + (idx + 1) + " / " + images.length + "</span>" +
      "</div>"
    );
  }

  $(document).on("click", ".pv-slide-prev, .pv-slide-next", function (e) {
    e.preventDefault();
    e.stopPropagation();

    var slideKey = $(this).data("slide-key");
    var images = SLIDE_IMAGES[slideKey] || [];
    if (!images.length) return;

    var dir = $(this).hasClass("pv-slide-prev") ? -1 : 1;
    SLIDE_STATE[slideKey] = ((SLIDE_STATE[slideKey] || 0) + dir + images.length) % images.length;

    if (slideKey === "item") {
      updateItemPreview();
    } else {
      updateContentPreview(slideKey);
    }
  });


  $(".tab-btn").on("click", function () {
    var tab = $(this).data("tab");
    $(".tab-btn").removeClass("active");
    $(this).addClass("active");
    $(".tab-panel").removeClass("active");
    $("#tab-" + tab).addClass("active");
  });


  var CONTENT_PREVIEW_RENDERERS = {
    hero: function (v) {
      return (
        '<span class="pv-badge">' + escapeHtml(v.badge || "Badge") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "Judul hero") + "</h3>" +
        '<p class="pv-sub">' + escapeHtml(v.subheading || "") + "</p>" +
        '<div class="pv-search">' + escapeHtml(v.search_placeholder || "Search...") + "</div>" +
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
      var img = buildPreviewMediaBlock("about", parseImagesField(v.images), v.media_text);
      return (
        img +
        '<span class="pv-eyebrow">' + escapeHtml(v.eyebrow || "") + "</span>" +
        '<h3 class="pv-heading">' + escapeHtml(v.heading || "Judul") + "</h3>" +
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
          "<strong>Content Studio</strong>" +
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
          if (field === "images") return;
          $(this).val(data[field] !== undefined ? data[field] : "");
        });

        if (key === "about") {
          var initialImages = parseImagesField(data.images);
          $("#aboutImagesField").val(JSON.stringify(initialImages));
          buildImageManager($("#aboutImageManager"), initialImages, function (images) {
            $("#aboutImagesField").val(JSON.stringify(images));
            updateContentPreview("about");
          });
        }

        updateContentPreview(key);
      })
      .fail(handleAuthFail);
  }

  CONTENT_KEYS.forEach(loadContentForm);

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
    $status.removeClass("err").text("Saving...");

    $.ajax({
      url: "/admin/api/content/" + key,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function () {
        $status.text("Saved ✓");
        setTimeout(function () { $status.text(""); }, 2000);
      })
      .fail(function (xhr) {
        handleAuthFail(xhr);
        $status.addClass("err").text("Unable to save changes.");
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
      title: "Store",
      endpoint: "stores",
      columns: ["images", "nama", "alamat", "jarak", "jam_buka", "status", "rating", "ulasan_count"],
      fields: [
        { name: "nama", label: "Store Name", type: "text", required: true },
        { name: "alamat", label: "Address", type: "text" },
        { name: "jarak", label: "Distance (e.g. 1.2 km)", type: "text" },
        { name: "jam_buka", label: "Opening Hours", type: "text" },
        { name: "status", label: "Status", type: "select", options: [{ value: "Buka", label: "Open" }, { value: "Tutup", label: "Closed" }] },
        { name: "rating", label: "Rating", type: "number", step: "0.1", min: "0", max: "5" },
        { name: "ulasan_count", label: "Review Count", type: "number", min: "0" },
        { name: "images", label: "Store Images (multiple allowed)", type: "images" },
      ],
      preview: function (v) {
        var img = buildPreviewMediaBlock("item", parseImagesField(v.images), "No images added yet");
        var buka = v.status !== "Tutup";
        return (
          img +
          '<div class="pv-card">' +
            "<h4>" + escapeHtml(v.nama || "Store Name") + "</h4>" +
            "<p>" + escapeHtml(v.alamat || "") + "</p>" +
            "<p>" + escapeHtml(v.jarak || "") + " &middot; " + escapeHtml(v.jam_buka || "") + "</p>" +
            '<div class="pv-row">' +
              '<span class="pv-status ' + (buka ? "buka" : "tutup") + '">' + escapeHtml(v.status === "Tutup" ? "Closed" : "Open") + "</span>" +
              "<span>★ " + (v.rating || 0) + " (" + (v.ulasan_count || 0) + ")</span>" +
            "</div>" +
          "</div>"
        );
      },
    },
    menu: {
      title: "Menu Item",
      endpoint: "menu",
      columns: ["images", "nama", "deskripsi", "harga", "store_id"],
      fields: [
        { name: "nama", label: "Menu Name", type: "text", required: true },
        { name: "deskripsi", label: "Description", type: "text" },
        { name: "harga", label: "Price (e.g. $15.00)", type: "text" },
        { name: "images", label: "Menu Images (multiple allowed)", type: "images" },
        { name: "store_id", label: "Store", type: "store-select" },
      ],
      preview: function (v) {
        var img = buildPreviewMediaBlock("item", parseImagesField(v.images), "No images added yet");
        var store = STORES_CACHE.find(function (s) { return String(s.id) === String(v.store_id); });
        return (
          img +
          '<div class="pv-card">' +
            "<h4>" + escapeHtml(v.nama || "Menu Name") + "</h4>" +
            "<p>" + escapeHtml(v.deskripsi || "") + "</p>" +
            '<div class="pv-row">' +
              '<span class="pv-price">' + escapeHtml(v.harga || "") + "</span>" +
              "<span style='font-size:.75rem;color:var(--text-muted);'>" + (store ? escapeHtml(store.nama) : "No store selected") + "</span>" +
            "</div>" +
          "</div>"
        );
      },
    },
    testimonials: {
      title: "Customer Review",
      endpoint: "testimonials",
      columns: ["nama", "ulasan", "waktu", "stars"],
      fields: [
        { name: "nama", label: "Name", type: "text", required: true },
        { name: "ulasan", label: "Review", type: "textarea" },
        { name: "waktu", label: "Time Label (e.g. 2 days ago)", type: "text" },
        { name: "stars", label: "Star Rating (1-5)", type: "number", min: "1", max: "5" },
      ],
      preview: function (v) {
        var stars = Math.max(0, Math.min(5, parseInt(v.stars, 10) || 5));
        return (
          '<div class="pv-card">' +
            '<div class="pv-stars">' + "★".repeat(stars) + "</div>" +
            "<h4>" + escapeHtml(v.nama || "Name") + "</h4>" +
            "<p>" + escapeHtml(v.ulasan || "") + "</p>" +
            "<p style='font-size:.72rem;'>" + escapeHtml(v.waktu || "") + "</p>" +
          "</div>"
        );
      },
    },
    faqs: {
      title: "FAQ Entry",
      endpoint: "faqs",
      columns: ["question", "answer"],
      fields: [
        { name: "question", label: "Question", type: "text", required: true },
        { name: "answer", label: "Answer", type: "textarea" },
      ],
      preview: function (v) {
        return (
          '<div class="pv-faq-item">' +
            '<div class="q">' + escapeHtml(v.question || "Question") + "</div>" +
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
        '<tr><td colspan="' + (config.columns.length + 1) + '" style="color:#66756C;">No records found.</td></tr>'
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
            return "<td>" + (store ? escapeHtml(store.nama) : "<em>No store selected</em>") + "</td>";
          }
          if (col === "images") {
            var imgs = Array.isArray(val) ? val : parseImagesField(val);
            if (!imgs.length) return '<td style="color:#66756C;font-size:0.8rem;">None</td>';
            var thumb = '<img src="' + escapeHtml(imgs[0]) + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px;">';
            var badge = imgs.length > 1 ? '<span class="image-count-badge">+' + (imgs.length - 1) + '</span>' : "";
            return '<td><span style="position:relative;display:inline-block;">' + thumb + badge + "</span></td>";
          }
          return "<td>" + escapeHtml(truncate(val)) + "</td>";
        })
        .join("");

      var $row = $(
        "<tr>" + cells +
          '<td class="row-actions">' +
            '<button class="edit-btn" data-list="' + listKey + '" data-id="' + item.id + '">Edit</button>' +
            '<button class="delete-btn" data-list="' + listKey + '" data-id="' + item.id + '">Delete</button>' +
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

      if (f.type === "images") {
        var $hidden = $("<input>").attr("type", "hidden").attr("data-field", f.name);
        var initialImages = parseImagesField(value);
        $hidden.val(JSON.stringify(initialImages));

        var $managerBox = $('<div class="image-manager"></div>');
        buildImageManager($managerBox, initialImages, function (images) {
          $hidden.val(JSON.stringify(images));
          updateItemPreview();
        });

        $container.append($label).append($managerBox).append($hidden);
        return;
      }

      if (f.type === "textarea") {
        $input = $("<textarea>").attr("rows", 3).attr("data-field", f.name).val(value || "");
      } else if (f.type === "store-select") {
        $input = $("<select>").attr("data-field", f.name);
        $input.append($("<option>").val("").text("— Select Store —"));
        STORES_CACHE.forEach(function (store) {
          $input.append($("<option>").val(store.id).text(store.nama));
        });
        $input.val(value || "");
      } else if (f.type === "select") {
        $input = $("<select>").attr("data-field", f.name);
        f.options.forEach(function (opt) {
          var optionValue = typeof opt === "object" ? opt.value : opt;
          var optionLabel = typeof opt === "object" ? opt.label : opt;
          $input.append($("<option>").val(optionValue).text(optionLabel));
        });
        $input.val(value || (typeof f.options[0] === "object" ? f.options[0].value : f.options[0]));
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
    SLIDE_STATE.item = 0;
    $("#itemModalTitle").text((item ? "Edit " : "Add ") + config.title);
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
    SLIDE_STATE.item = 0;
    SLIDE_IMAGES.item = [];
  }

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

    if (!confirm("Delete this item?")) return;

    $.ajax({ url: "/admin/api/" + config.endpoint + "/" + id, method: "DELETE" })
      .done(function () { loadList(listKey); })
      .fail(function (xhr) {
        handleAuthFail(xhr);
        alert("Unable to delete the item.");
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
        alert("Unable to save the item.");
      });
  });

});

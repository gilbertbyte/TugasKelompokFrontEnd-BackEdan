$(function () {

  var STATE = { stores: [], menu: [] };
  var WISHLIST_IDS = { menu: {}, store: {} };

  /*Helpers*/

  function escapeHtml(str) {
    return $("<div>").text(str == null ? "" : str).html();
  }

  function applyContent(content) {
    content = content || {};

    $("[data-content]").each(function () {
      var parts = $(this).attr("data-content").split(".");
      var block = content[parts[0]];
      var value = block ? block[parts[1]] : undefined;
      if (value !== undefined && value !== null && value !== "") $(this).text(value);
    });

    $("[data-content-placeholder]").each(function () {
      var parts = $(this).attr("data-content-placeholder").split(".");
      var block = content[parts[0]];
      var value = block ? block[parts[1]] : undefined;
      if (value !== undefined && value !== null && value !== "") $(this).attr("placeholder", value);
    });

    if (content.site && content.site.site_title) document.title = content.site.site_title;
  }

  function renderFaqs(faqs) {
    var $accordion = $("#faqAccordion").empty();

    (faqs || []).forEach(function (faq) {
      $accordion.append(
        '<div class="accordion-item">' +
          '<button class="accordion-trigger" type="button">' + escapeHtml(faq.question) + '</button>' +
          '<div class="accordion-panel"><p>' + escapeHtml(faq.answer) + '</p></div>' +
        '</div>'
      );
    });
  }

  function imageList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string" || !value) return [];
    try {
      var parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {}
    return [value];
  }

  function imageSlideshowHtml(value, alt) {
    var images = imageList(value);
    if (!images.length) return "";
    var slides = images.map(function (url, index) {
      return '<img class="image-slide' + (index === 0 ? ' active' : '') + '" src="' + escapeHtml(url) +
        '" alt="' + escapeHtml(alt) + '" aria-hidden="' + (index !== 0) + '">';
    }).join("");
    var controls = images.length > 1
      ? '<button class="image-slide-arrow image-slide-prev" type="button" data-direction="-1" aria-label="Gambar sebelumnya">‹</button>' +
        '<button class="image-slide-arrow image-slide-next" type="button" data-direction="1" aria-label="Gambar berikutnya">›</button>' +
        '<span class="image-slide-counter" aria-live="polite">1 / ' + images.length + '</span>'
      : "";
    return '<div class="image-slideshow">' + slides + controls + '</div>';
  }

  function imageMediaHtml(value, alt, placeholder) {
    var images = imageList(value);
    if (!images.length) {
      return placeholder ? '<div class="card-media">' + escapeHtml(placeholder) + '</div>' : "";
    }
    return '<div class="card-media has-slideshow">' + imageSlideshowHtml(images, alt) + '</div>';
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

  function formatStoreHours(store) {
    if (timeToMinutes(store.jam_buka) === null || timeToMinutes(store.jam_tutup) === null) return "-";
    return formatTime(store.jam_buka) + " - " + formatTime(store.jam_tutup);
  }

  $(document).on("click", ".image-slide-arrow", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var $slideshow = $(this).closest(".image-slideshow");
    var $slides = $slideshow.find(".image-slide");
    var activeIndex = $slides.index($slides.filter(".active"));
    var nextIndex = (activeIndex + Number($(this).data("direction")) + $slides.length) % $slides.length;
    $slides.removeClass("active").attr("aria-hidden", "true").eq(nextIndex).addClass("active").attr("aria-hidden", "false");
    $slideshow.find(".image-slide-counter").text((nextIndex + 1) + " / " + $slides.length);
  });

  function wishlistBtnHtml(type, id) {
    var isSaved = !!WISHLIST_IDS[type][id];
    return '<button class="wishlist-btn' + (isSaved ? ' saved' : '') + '" data-type="' + type + '" data-id="' + id +
      '" title="' + (isSaved ? "Hapus dari List Aku" : "Simpan ke List Aku") + '" type="button">' +
      (isSaved ? "♥" : "♡") + "</button>";
  }

  /*Wishlist ("List yang pengen kamu coba")*/

  function loadWishlistIds() {
    $.getJSON("/api/wishlist/ids")
      .done(function (rows) {
        WISHLIST_IDS = { menu: {}, store: {} };
        rows.forEach(function (r) {
          WISHLIST_IDS[r.item_type][r.item_id] = true;
        });
        renderTokoPopuler(STATE.stores.slice(0, 3));
        renderTokoHasil(STATE.stores);
        renderMenu(STATE.menu);
      });
  }

  $(document).on("click", ".wishlist-btn", function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    var type = $(this).data("type");
    var id = $(this).data("id");
    var isSaved = !!WISHLIST_IDS[type][id];

    if (isSaved) {
      $.ajax({ url: "/api/wishlist/" + type + "/" + id, method: "DELETE" }).done(loadWishlistIds);
    } else {
      $.ajax({
        url: "/api/wishlist",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ item_type: type, item_id: id }),
      }).done(loadWishlistIds);
    }
  });

  /*Renderers*/

  function renderTokoPopuler(list) {
    var $grid = $("#tokoPopulerGrid").empty();
    list.forEach(function (t) {
      var buka = storeIsOpen(t);
      var statusClass = buka ? "status-open" : "status-closed";
      var statusText = buka ? "Buka sekarang" : "Tutup";
      var media = imageMediaHtml(t.image_url, t.nama, "Ceritanya gambar lokasi");
      $grid.append(
        '<div class="store-card" data-store-id="' + t.id + '">' +
          media +
          '<div class="card-body">' +
            wishlistBtnHtml("store", t.id) +
            "<h3>" + escapeHtml(t.nama) + "</h3>" +
            '<p class="meta">Jam Buka: ' + escapeHtml(formatStoreHours(t)) + "</p>" +
            '<p class="store-status ' + statusClass + '" data-store-status-id="' + t.id + '">' + statusText + "</p>" +
            '<span class="rating">★ ' + t.rating + "</span>" +
          "</div>" +
        "</div>"
      );
    });
  }

  var MENU_PAGE_SIZE = 8;
  var menuCurrentPage = 1;

  function renderMenu(list) {
    var totalPages = Math.max(1, Math.ceil(list.length / MENU_PAGE_SIZE));
    if (menuCurrentPage > totalPages) menuCurrentPage = totalPages;
    var start = (menuCurrentPage - 1) * MENU_PAGE_SIZE;
    var pageItems = list.slice(start, start + MENU_PAGE_SIZE);

    var $grid = $("#menuGrid").empty();
    renderMenuPagination(list, totalPages);
    pageItems.forEach(function (m) {
      var media = imageMediaHtml(m.image_url, m.nama, "Ceritanya gambar Menu");

      var storeInfo = m.store_nama
        ? '<p class="menu-store-info">Tersedia di: <strong>' + escapeHtml(m.store_nama) + '</strong></p>' +
          '<a href="#" class="link-arrow menu-toko-link" data-store-id="' + m.store_id + '">Lihat Toko Ini</a>'
        : '<p class="menu-store-info">Toko belum ditentukan</p>';

      $grid.append(
        '<div class="menu-card" data-menu-id="' + m.id + '">' +
          media +
          '<div class="card-body">' +
            wishlistBtnHtml("menu", m.id) +
            "<h3>" + escapeHtml(m.nama) + "</h3>" +
            '<p class="desc">' + escapeHtml(m.deskripsi || "") + "</p>" +
            '<span class="price">' + escapeHtml(m.harga || "") + "</span>" +
            storeInfo +
          "</div>" +
        "</div>"
      );
    });
  }

  function renderMenuPagination(list, totalPages) {
    var $pagination = $("#menuPagination").empty();
    if (totalPages <= 1) return;

    function goTo(page) {
      if (page < 1 || page > totalPages || page === menuCurrentPage) return;
      menuCurrentPage = page;
      renderMenu(list);
      $("html, body").animate(
        { scrollTop: $("#menu").offset().top - 80 },
        300
      );
    }

    var $prev = $('<button class="page-btn page-arrow" type="button" aria-label="Halaman sebelumnya">&#8249;</button>');
    var $next = $('<button class="page-btn page-arrow" type="button" aria-label="Halaman berikutnya">&#8250;</button>');
    var $info = $('<span class="page-info"></span>').text(menuCurrentPage + " / " + totalPages);

    if (menuCurrentPage === 1) $prev.prop("disabled", true);
    if (menuCurrentPage === totalPages) $next.prop("disabled", true);

    $prev.on("click", function () { goTo(menuCurrentPage - 1); });
    $next.on("click", function () { goTo(menuCurrentPage + 1); });

    $pagination.append($prev, $info, $next);
  }

  function renderTokoHasil(list) {
    var $grid = $("#tokoHasilGrid").empty();
    list.forEach(function (t) {
      var buka = storeIsOpen(t);
      var statusClass = buka ? "status-open" : "status-closed";
      var statusText = buka ? "Buka" : "Tutup";
      var media = imageMediaHtml(t.image_url, t.nama, "");
      $grid.append(
        '<div class="store-card" data-store-id="' + t.id + '">' +
          media +
          '<div class="card-body">' +
            wishlistBtnHtml("store", t.id) +
            "<h3>" + escapeHtml(t.nama) + "</h3>" +
            '<p class="meta">' + escapeHtml(t.alamat || "") + "</p>" +
            '<p class="meta">Jam Buka: ' + escapeHtml(formatStoreHours(t)) + "</p>" +
            '<p class="store-status ' + statusClass + '" data-store-status-id="' + t.id + '">' + statusText + "</p>" +
            '<span class="rating">★ ' + t.rating + "</span><br>" +
            '<a href="#" class="link-arrow" style="margin-top:10px;display:inline-block;">Lihat Detail</a>' +
          "</div>" +
        "</div>"
      );
    });
    $("#resultsCount").text(list.length);
  }

  /*Load toko & menu dari server*/

  function loadStoresAndMenu() {
    $.getJSON("/api/site-content")
      .done(function (data) {
        STATE.stores = data.stores || [];
        STATE.menu = data.menu || [];
        applyContent(data.content);
        renderFaqs(data.faqs);
        var about = (data.content && data.content.about) || {};
        var aboutImages = about.images || about.image_url;
        var aboutMedia = imageSlideshowHtml(aboutImages, about.heading || "Tentang platform") || escapeHtml(about.media_text || "");
        $("#tentang .media-frame").toggleClass("has-slideshow", imageList(aboutImages).length > 0).html(aboutMedia);
        renderTokoPopuler(STATE.stores.slice(0, 3));
        renderTokoHasil(STATE.stores);
        renderMenu(STATE.menu);
      })
      .fail(function () {
        $("#tokoPopulerGrid, #tokoHasilGrid, #menuGrid").html(
          '<p style="color:#B23A55;">Gagal memuat data dari server.</p>'
        );
      });
  }

  loadStoresAndMenu();

  /*Hero search*/

  $("#heroSearchForm").on("submit", function (e) {
    e.preventDefault();
    var q = $("#heroSearchInput").val().trim();
    $("#filterNama").val(q);
    $("html, body").animate({ scrollTop: $("#cari-toko").offset().top - 80 }, 400);
    applyFilter();
  });

  /*Filter / search section*/

  function applyFilter() {
    var nama = $("#filterNama").val().trim().toLowerCase();
    var status = $("#filterStatus").val();
    var sort = $("#filterSort").val();

    var filtered = STATE.stores.filter(function (t) {
      var matchNama = !nama || t.nama.toLowerCase().indexOf(nama) !== -1;
      var matchStatus =
        status === "Semua Status" ||
        (status === "Buka" && storeIsOpen(t)) ||
        (status === "Tutup" && !storeIsOpen(t));
      return matchNama && matchStatus;
    });

    if (sort === "Rating Tertinggi") {
      filtered.sort(function (a, b) { return b.rating - a.rating; });
    } else if (sort === "Nama A-Z") {
      filtered.sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    }

    renderTokoHasil(filtered);
  }

  $("#filterForm").on("submit", function (e) {
    e.preventDefault();
    applyFilter();
  });

  window.setInterval(function () {
    if (!STATE.stores.length) return;
    renderTokoPopuler(STATE.stores.slice(0, 3));
    applyFilter();
    var detailStore = findStoreById($("#storeDetailStatus").attr("data-store-id"));
    if (detailStore) {
      var isOpen = storeIsOpen(detailStore);
      $("#storeDetailStatus")
        .attr("class", "detail-status " + (isOpen ? "status-open" : "status-closed"))
        .text(isOpen ? "Buka sekarang" : "Tutup");
    }
  }, 60000);

  /*Add to cart feedback*/

  $(document).on("click", ".add-btn", function () {
    var $btn = $(this);
    $btn.text("✓");
    setTimeout(function () { $btn.text("+"); }, 900);
  });

  /*FAQ accordion*/

  $("#faqAccordion").on("click", ".accordion-trigger", function () {
    var $item = $(this).closest(".accordion-item");
    var $panel = $item.find(".accordion-panel");
    var isOpen = $item.hasClass("open");

    $("#faqAccordion .accordion-item").removeClass("open").find(".accordion-panel").css("max-height", 0);

    if (!isOpen) {
      $item.addClass("open");
      $panel.css("max-height", $panel.prop("scrollHeight") + "px");
    }
  });

  /*Tulis Ulasan (review)*/

  function fillReviewTargetOptions() {
    var type = $("#reviewTargetType").val();
    var $target = $("#reviewTargetId").empty().append('<option value="">-- Pilih --</option>');

    if (type === "menu") {
      STATE.menu.forEach(function (m) {
        var label = m.nama + (m.store_nama ? " (" + m.store_nama + ")" : "");
        $target.append($("<option></option>").val(m.id).text(label));
      });
    } else {
      STATE.stores.forEach(function (s) {
        $target.append($("<option></option>").val(s.id).text(s.nama));
      });
    }
  }

  function openReviewModal() {
    if (!currentUser) {
      closeAuthModal();
      openAuthModal("login");
      return;
    }
    $("#reviewError").removeClass("show").text("");
    $("#reviewSuccess").removeClass("show").text("");
    $("#reviewForm").show();
    $("#reviewTargetType").val("store");
    fillReviewTargetOptions();
    $("#reviewModalOverlay").addClass("open");
  }

  function closeReviewModal() {
    $("#reviewModalOverlay").removeClass("open");
  }

  $("#tulisUlasanBtn").on("click", openReviewModal);
  $("#reviewModalClose").on("click", closeReviewModal);
  $("#reviewModalOverlay").on("click", function (e) {
    if (e.target === this) closeReviewModal();
  });
  $("#reviewTargetType").on("change", fillReviewTargetOptions);

  $("#reviewForm").on("submit", function (e) {
    e.preventDefault();
    $("#reviewError").removeClass("show").text("");

    var targetId = $("#reviewTargetId").val();
    if (!targetId) {
      $("#reviewError").addClass("show").text("Pilih dulu toko atau menu yang mau kamu ulas.");
      return;
    }

    var payload = {
      ulasan: $("#reviewText").val().trim(),
      stars: $("#reviewStars").val(),
      target_type: $("#reviewTargetType").val(),
      target_id: targetId,
    };

    $.ajax({
      url: "/api/testimonials",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function (data) {
        $("#reviewForm").hide();
        $("#reviewSuccess").addClass("show").text(data.message);
        $("#reviewForm")[0].reset();
      })
      .fail(function (xhr) {
        var msg =
          (xhr.responseJSON && xhr.responseJSON.error) ||
          "Gagal mengirim ulasan. Coba lagi.";
        $("#reviewError").addClass("show").text(msg);
      });
  });

  /*Load testimoni dari backend (hanya yang sudah di-approve)*/

  var TESTIMONI_PAGE_SIZE = 6;
  var testimoniData = [];
  var testimoniCurrentPage = 1;

  function loadTestimoniFromServer() {
    $.getJSON("/api/site-content", function (data) {
      if (data && data.testimonials) {
        var mapped = data.testimonials.map(function (t) {
          return {
            nama: t.nama,
            ulasan: t.ulasan,
            waktu: t.waktu,
            stars: t.stars,
            target_type: t.target_type,
            target_nama: t.target_nama,
          };
        });
        if (mapped.length) {
          testimoniData = mapped;
          testimoniCurrentPage = 1;
          renderTestimoniPage();
        }
      }
    });
  }

  function renderTestimoniPage() {
    var totalPages = Math.max(1, Math.ceil(testimoniData.length / TESTIMONI_PAGE_SIZE));
    if (testimoniCurrentPage > totalPages) testimoniCurrentPage = totalPages;

    var start = (testimoniCurrentPage - 1) * TESTIMONI_PAGE_SIZE;
    var pageItems = testimoniData.slice(start, start + TESTIMONI_PAGE_SIZE);

    renderTestimoniFromData(pageItems);
    renderTestimoniPagination(totalPages);
  }

  function renderTestimoniFromData(list) {
    var $grid = $("#testimoniGrid").empty();
    list.forEach(function (t) {
      var starCount = Number(t.stars) || 5;
      var stars = "★".repeat(starCount) + "☆".repeat(5 - starCount);
      var targetLabel = t.target_nama
        ? (t.target_type === "menu" ? "Menu: " : "Toko: ") + escapeHtml(t.target_nama)
        : "";
      var card = $(
        '<div class="testi-card">' +
          '<div class="stars">' + stars + '</div>' +
          '<div class="name">' + escapeHtml(t.nama) + '</div>' +
          (targetLabel ? '<div class="pill pill-mustard" style="margin-bottom:8px;">' + targetLabel + '</div>' : '') +
          '<p>' + escapeHtml(t.ulasan) + '</p>' +
          '<div class="when">' + escapeHtml(t.waktu) + '</div>' +
        '</div>'
      );
      $grid.append(card);
    });
  }

  function renderTestimoniPagination(totalPages) {
    var $pagination = $("#testimoniPagination").empty();
    if (totalPages <= 1) return;

    function goTo(page) {
      if (page < 1 || page > totalPages || page === testimoniCurrentPage) return;
      testimoniCurrentPage = page;
      renderTestimoniPage();
      $("html, body").animate(
        { scrollTop: $("#testimoni").offset().top - 80 },
        300
      );
    }

    var $prev = $('<button class="page-btn page-arrow" type="button" aria-label="Halaman sebelumnya">&#8249;</button>');
    var $next = $('<button class="page-btn page-arrow" type="button" aria-label="Halaman berikutnya">&#8250;</button>');
    var $info = $('<span class="page-info"></span>').text(testimoniCurrentPage + " / " + totalPages);

    if (testimoniCurrentPage === 1) $prev.prop("disabled", true);
    if (testimoniCurrentPage === totalPages) $next.prop("disabled", true);

    $prev.on("click", function () { goTo(testimoniCurrentPage - 1); });
    $next.on("click", function () { goTo(testimoniCurrentPage + 1); });

    $pagination.append($prev, $info, $next);
  }

  loadTestimoniFromServer();

  /*Auth: modal open/close*/

  function openAuthModal(tab) {
    $("#authError").removeClass("show").text("");
    $("#registerTokoSuccess").remove();
    $(".modal-tab").removeClass("active");
    $('.modal-tab[data-tab="' + (tab || "login") + '"]').addClass("active");
    $("#loginForm").toggle(tab !== "register");
    $("#registerForm").toggle(tab === "register");
    $(".type-toggle-btn").removeClass("active");
    $('.type-toggle-btn[data-register-type="user"]').addClass("active");
    $("#registerType").val("user");
    $("#registerTokoFields").hide();
    $("#registerNamaToko").prop("required", false);
    $("#authModalOverlay").addClass("open");
  }

  function closeAuthModal() {
    $("#authModalOverlay").removeClass("open");
  }

  $(document).on("click", "#loginBtn", function () {
    openAuthModal("login");
  });
  $(document).on("click", ".type-toggle-btn", function () {
    var type = $(this).data("register-type");
    $(".type-toggle-btn").removeClass("active");
    $(this).addClass("active");
    $("#registerType").val(type);

    var isToko = type === "toko";
    $("#registerTokoFields").toggle(isToko);
    $("#registerNamaToko").prop("required", isToko);
  });

  $("#authModalClose").on("click", closeAuthModal);
  $("#authModalOverlay").on("click", function (e) {
    if (e.target === this) closeAuthModal();
  });

  $(".modal-tab").on("click", function () {
    openAuthModal($(this).data("tab"));
  });

  function showAuthError(msg) {
    $("#authError").addClass("show").text(msg);
  }

  /*Auth: render logged-in state*/

  var currentUser = null;

  function renderAuthArea(user) {
    currentUser = user || null;
    var $area = $("#authArea").empty();
    if (user) {
      var $chip = $('<div class="user-chip"></div>')
        .append($("<span></span>").text("Hai, " + user.nama));

      if (user.role === "toko") {
        $chip.append(
          $('<a href="/toko-dashboard.html" class="btn btn-mustard">Dashboard Toko</a>')
        );
      }

      $chip.append(
        $('<button class="btn btn-outline-light" id="logoutBtn">Logout</button>')
      );

      $area.append($chip);
      $("#navWishlist").show();
      loadWishlistIds();
    } else {
      $area.append(
        '<button class="btn btn-outline-light" id="loginBtn">Login / Sign In</button>'
      );
      $("#navWishlist").hide();
      WISHLIST_IDS = { menu: {}, store: {} };
      renderTokoPopuler(STATE.stores.slice(0, 3));
      renderTokoHasil(STATE.stores);
      renderMenu(STATE.menu);
    }
  }

  $(document).on("click", "#logoutBtn", function () {
    $.post("/api/user/logout").always(function () {
      renderAuthArea(null);
    });
  });

  function checkAuthStatus() {
    $.getJSON("/api/user/me").done(function (data) {
      if (data.loggedIn) {
        renderAuthArea({ nama: data.nama, email: data.email, role: data.role });
      }
    });
  }

  checkAuthStatus();

  /*Auth: login submit */

  $("#loginForm").on("submit", function (e) {
    e.preventDefault();
    $("#authError").removeClass("show").text("");

    var payload = {
      email: $("#loginEmail").val().trim(),
      password: $("#loginPassword").val(),
    };

    $.ajax({
      url: "/api/user/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function (data) {
        if (data.role === "toko") {
          window.location.href = "/toko-dashboard.html";
          return;
        }
        closeAuthModal();
        renderAuthArea({ nama: data.nama, email: data.email });
        $("#loginForm")[0].reset();
      })
      .fail(function (xhr) {
        var msg =
          (xhr.responseJSON && xhr.responseJSON.error) ||
          "Login gagal. Coba lagi.";
        showAuthError(msg);
      });
  });

  /* Detail modals (toko & menu)*/

  $(document).on("click", ".store-card a", function (e) {
    e.preventDefault();
  });

  $(document).on("click", ".wishlist-btn", function (e) {
    e.stopPropagation();
  });

  $(document).on("click", ".menu-toko-link", function (e) {
    e.preventDefault();
    e.stopPropagation();
    openStoreDetail($(this).data("store-id"));
  });

  $(document).on("click", ".store-card", function () {
    openStoreDetail($(this).data("store-id"));
  });

  $(document).on("click", ".menu-card", function () {
    openMenuDetail($(this).data("menu-id"));
  });

  $(document).on("click", ".mini-menu-card", function () {
    var menuId = $(this).data("menu-id");
    closeStoreDetail();
    openMenuDetail(menuId);
  });

  $(document).on("click", ".detail-store-link", function () {
    var storeId = $(this).data("store-id");
    closeMenuDetail();
    openStoreDetail(storeId);
  });

  function findStoreById(id) {
    return STATE.stores.filter(function (s) { return String(s.id) === String(id); })[0];
  }

  function findMenuById(id) {
    return STATE.menu.filter(function (m) { return String(m.id) === String(id); })[0];
  }

  function openStoreDetail(storeId) {
    var store = findStoreById(storeId);
    if (!store) return;

    $("#storeDetailHero").html(
      imageSlideshowHtml(store.image_url, store.nama) || '<div class="detail-hero-placeholder">Ceritanya Gambar Toko</div>'
    );

    var buka = storeIsOpen(store);
    $("#storeDetailStatus")
      .attr("class", "detail-status " + (buka ? "status-open" : "status-closed"))
      .attr("data-store-id", store.id)
      .text(buka ? "Buka sekarang" : "Tutup");
    $("#storeDetailNama").text(store.nama);
    $("#storeDetailAlamat").text(store.alamat || "-");
    $("#storeDetailRating").html("★ " + (store.rating || 0));
    $("#storeDetailJam").text(formatStoreHours(store));

    var storeMenus = STATE.menu.filter(function (m) {
      return String(m.store_id) === String(store.id);
    });
    var $list = $("#storeDetailMenuList").empty();
    if (!storeMenus.length) {
      $list.append('<p class="meta">Belum ada menu untuk toko ini.</p>');
    } else {
      storeMenus.forEach(function (m) {
        $list.append(
          '<div class="mini-menu-card" data-menu-id="' + m.id + '">' +
            (imageSlideshowHtml(m.image_url, m.nama) || '<div class="mini-menu-img-placeholder"></div>') +
            '<div class="mini-menu-info">' +
              "<h5>" + escapeHtml(m.nama) + "</h5>" +
              '<span class="price">' + escapeHtml(m.harga || "") + "</span>" +
            "</div>" +
          "</div>"
        );
      });
    }

    $("#storeDetailModal").addClass("active");
  }

  function closeStoreDetail() {
    $("#storeDetailModal").removeClass("active");
  }

  function openMenuDetail(menuId) {
    var menu = findMenuById(menuId);
    if (!menu) return;

    $("#menuDetailHero").html(
      imageSlideshowHtml(menu.image_url, menu.nama) || '<div class="detail-hero-placeholder">Ceritanya Gambar Menu</div>'
    );
    $("#menuDetailNama").text(menu.nama);
    $("#menuDetailHarga").text(menu.harga || "");
    $("#menuDetailDeskripsi").text(menu.deskripsi || "Tidak ada deskripsi untuk menu ini.");

    if (menu.store_id) {
      $("#menuDetailStoreBox").html(
        '<div class="detail-store-link" data-store-id="' + menu.store_id + '">' +
          "<div>" +
            "<strong>" + escapeHtml(menu.store_nama || "") + "</strong>" +
            '<p class="meta" style="margin:2px 0 0;">' + escapeHtml(menu.store_alamat || "") + "</p>" +
          "</div>" +
          '<span class="link-arrow no-arrow">Lihat Toko</span>' +
        "</div>"
      );
    } else {
      $("#menuDetailStoreBox").html('<p class="meta">Toko belum ditentukan.</p>');
    }

    $("#menuDetailModal").addClass("active");
  }

  function closeMenuDetail() {
    $("#menuDetailModal").removeClass("active");
  }

  $("#storeDetailClose").on("click", closeStoreDetail);
  $("#storeDetailModal").on("click", function (e) {
    if (e.target === this) closeStoreDetail();
  });

  $("#menuDetailClose").on("click", closeMenuDetail);
  $("#menuDetailModal").on("click", function (e) {
    if (e.target === this) closeMenuDetail();
  });

  /* Auth: register submit*/

  $("#registerForm").on("submit", function (e) {
    e.preventDefault();
    $("#authError").removeClass("show").text("");

    var isToko = $("#registerType").val() === "toko";

    if (isToko) {
      var tokoPayload = {
        nama: $("#registerNama").val().trim(),
        email: $("#registerEmail").val().trim(),
        password: $("#registerPassword").val(),
        nama_toko: $("#registerNamaToko").val().trim(),
        alamat: $("#registerAlamatToko").val().trim(),
      };

      $.ajax({
        url: "/api/user/register-toko",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(tokoPayload),
      })
        .done(function (data) {
          $("#registerForm").hide();
          $("#authError").removeClass("show").text("");
          $("#authModalOverlay .modal-box").append(
            '<p class="modal-success show" id="registerTokoSuccess">' + escapeHtml(data.message) + "</p>"
          );
          $("#registerForm")[0].reset();
          $("#registerTokoFields").hide();
        })
        .fail(function (xhr) {
          var msg =
            (xhr.responseJSON && xhr.responseJSON.error) ||
            "Registrasi gagal. Coba lagi.";
          showAuthError(msg);
        });
      return;
    }

    var payload = {
      nama: $("#registerNama").val().trim(),
      email: $("#registerEmail").val().trim(),
      password: $("#registerPassword").val(),
    };

    $.ajax({
      url: "/api/user/register",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function (data) {
        closeAuthModal();
        renderAuthArea({ nama: data.nama, email: data.email });
        $("#registerForm")[0].reset();
      })
      .fail(function (xhr) {
        var msg =
          (xhr.responseJSON && xhr.responseJSON.error) ||
          "Registrasi gagal. Coba lagi.";
        showAuthError(msg);
      });
  });

});
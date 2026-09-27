$(function () {

  var STATE = { stores: [], menu: [] };
  var WISHLIST_IDS = { menu: {}, store: {} };

  /* ---------- Helpers ---------- */

  function escapeHtml(str) {
    return $("<div>").text(str == null ? "" : str).html();
  }

  function wishlistBtnHtml(type, id) {
    var isSaved = !!WISHLIST_IDS[type][id];
    return '<button class="wishlist-btn' + (isSaved ? ' saved' : '') + '" data-type="' + type + '" data-id="' + id +
      '" title="' + (isSaved ? "Hapus dari List Aku" : "Simpan ke List Aku") + '" type="button">' +
      (isSaved ? "♥" : "♡") + "</button>";
  }

  /* ---------- Wishlist ("List yang pengen kamu coba") ---------- */

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

  /* ---------- Renderers ---------- */

  function renderTokoPopuler(list) {
    var $grid = $("#tokoPopulerGrid").empty();
    list.forEach(function (t) {
      var buka = t.status === "Buka";
      var statusClass = buka ? "status-open" : "status-closed";
      var statusText = buka ? "Buka sekarang" : "Tutup";
      var media = t.image_url
        ? '<div class="card-media"><img src="' + escapeHtml(t.image_url) + '" alt="' + escapeHtml(t.nama) + '"></div>'
        : '<div class="card-media">Ceritanya gambar lokasi</div>';
      $grid.append(
        '<div class="store-card" data-store-id="' + t.id + '">' +
          media +
          '<div class="card-body">' +
            wishlistBtnHtml("store", t.id) +
            "<h3>" + escapeHtml(t.nama) + "</h3>" +
            '<p class="meta">Jam Buka: ' + escapeHtml(t.jam_buka || "-") + "</p>" +
            '<p class="' + statusClass + '">' + statusText + "</p>" +
            '<span class="rating">★ ' + t.rating + "</span>" +
          "</div>" +
        "</div>"
      );
    });
  }

  function renderMenu(list) {
    var $grid = $("#menuGrid").empty();
    list.forEach(function (m) {
      var media = m.image_url
        ? '<div class="card-media"><img src="' + escapeHtml(m.image_url) + '" alt="' + escapeHtml(m.nama) + '"></div>'
        : '<div class="card-media">Ceritanya gambar Menu</div>';

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

  function renderTokoHasil(list) {
    var $grid = $("#tokoHasilGrid").empty();
    list.forEach(function (t) {
      var buka = t.status === "Buka";
      var statusClass = buka ? "status-open" : "status-closed";
      var media = t.image_url
        ? '<div class="card-media"><img src="' + escapeHtml(t.image_url) + '" alt="' + escapeHtml(t.nama) + '"></div>'
        : "";
      $grid.append(
        '<div class="store-card" data-store-id="' + t.id + '">' +
          media +
          '<div class="card-body">' +
            wishlistBtnHtml("store", t.id) +
            "<h3>" + escapeHtml(t.nama) + "</h3>" +
            '<p class="meta">' + escapeHtml(t.alamat || "") + "</p>" +
            '<p class="meta">Jarak: ' + escapeHtml(t.jarak || "-") + "</p>" +
            '<p class="' + statusClass + '">' + escapeHtml(t.status) + " &middot; " + escapeHtml(t.jam_buka || "") + "</p>" +
            '<span class="rating">★ ' + t.rating + " (" + (t.ulasan_count || 0) + " ulasan)</span><br>" +
            '<a href="#" class="link-arrow" style="margin-top:10px;display:inline-block;">Lihat Detail</a>' +
          "</div>" +
        "</div>"
      );
    });
    $("#resultsCount").text(list.length);
  }

  /* ---------- Load toko & menu dari server ---------- */

  function loadStoresAndMenu() {
    $.getJSON("/api/site-content")
      .done(function (data) {
        STATE.stores = data.stores || [];
        STATE.menu = data.menu || [];
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

  /* ---------- Hero search ---------- */

  $("#heroSearchForm").on("submit", function (e) {
    e.preventDefault();
    var q = $("#heroSearchInput").val().trim();
    $("#filterNama").val(q);
    $("html, body").animate({ scrollTop: $("#cari-toko").offset().top - 80 }, 400);
    applyFilter();
  });

  /* ---------- Filter / search section ---------- */

  function applyFilter() {
    var nama = $("#filterNama").val().trim().toLowerCase();
    var kota = $("#filterKota").val().trim().toLowerCase();
    var status = $("#filterStatus").val();
    var sort = $("#filterSort").val();

    var filtered = STATE.stores.filter(function (t) {
      var matchNama = !nama || t.nama.toLowerCase().indexOf(nama) !== -1;
      var matchKota = !kota || (t.alamat || "").toLowerCase().indexOf(kota) !== -1;
      var matchStatus =
        status === "Semua Status" ||
        (status === "Buka" && t.status === "Buka") ||
        (status === "Tutup" && t.status === "Tutup");
      return matchNama && matchKota && matchStatus;
    });

    if (sort === "Rating Tertinggi") {
      filtered.sort(function (a, b) { return b.rating - a.rating; });
    } else if (sort === "Jarak Terdekat") {
      filtered.sort(function (a, b) { return parseFloat(a.jarak) - parseFloat(b.jarak); });
    } else if (sort === "Nama A-Z") {
      filtered.sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    }

    renderTokoHasil(filtered);
  }

  $("#filterForm").on("submit", function (e) {
    e.preventDefault();
    applyFilter();
  });

  /* ---------- Add to cart feedback ---------- */

  $(document).on("click", ".add-btn", function () {
    var $btn = $(this);
    $btn.text("✓");
    setTimeout(function () { $btn.text("+"); }, 900);
  });

  /* ---------- FAQ accordion ---------- */

  $(".accordion-trigger").on("click", function () {
    var $item = $(this).closest(".accordion-item");
    var $panel = $item.find(".accordion-panel");
    var isOpen = $item.hasClass("open");

    $(".accordion-item").removeClass("open").find(".accordion-panel").css("max-height", 0);

    if (!isOpen) {
      $item.addClass("open");
      $panel.css("max-height", $panel.prop("scrollHeight") + "px");
    }
  });

  /* ---------- Tulis Ulasan (review) ---------- */

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

  /* ---------- Load testimoni dari backend (hanya yang sudah di-approve) ---------- */

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

    for (var i = 1; i <= totalPages; i++) {
      var $btn = $('<button class="page-btn" type="button"></button>').text(i);
      if (i === testimoniCurrentPage) $btn.addClass("active");
      $btn.on("click", (function (page) {
        return function () {
          testimoniCurrentPage = page;
          renderTestimoniPage();
          $("html, body").animate(
            { scrollTop: $("#testimoni").offset().top - 80 },
            300
          );
        };
      })(i));
      $pagination.append($btn);
    }
  }

  loadTestimoniFromServer();

  /* ---------- Auth: modal open/close ---------- */

  function openAuthModal(tab) {
    $("#authError").removeClass("show").text("");
    $(".modal-tab").removeClass("active");
    $('.modal-tab[data-tab="' + (tab || "login") + '"]').addClass("active");
    $("#loginForm").toggle(tab !== "register");
    $("#registerForm").toggle(tab === "register");
    $("#authModalOverlay").addClass("open");
  }

  function closeAuthModal() {
    $("#authModalOverlay").removeClass("open");
  }

  $(document).on("click", "#loginBtn", function () {
    openAuthModal("login");
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

  /* ---------- Auth: render logged-in state ---------- */

  var currentUser = null;

  function renderAuthArea(user) {
    currentUser = user || null;
    var $area = $("#authArea").empty();
    if (user) {
      $area.append(
        $('<div class="user-chip"></div>')
          .append($("<span></span>").text("Hai, " + user.nama))
          .append(
            $('<button class="btn btn-outline-light" id="logoutBtn">Logout</button>')
          )
      );
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
        renderAuthArea({ nama: data.nama, email: data.email });
      }
    });
  }

  checkAuthStatus();

  /* ---------- Auth: login submit ---------- */

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

  /* ---------- Detail modals (toko & menu) ---------- */

  // Klik link/anchor di dalam store-card (mis. "Lihat Detail") tidak boleh ikut
  // pindah halaman (href="#"), tapi klik tetap boleh menggelembung ke handler
  // .store-card di bawah supaya modal Detail Toko tetap terbuka.
  $(document).on("click", ".store-card a", function (e) {
    e.preventDefault();
  });

  // Tombol wishlist tidak boleh ikut membuka modal detail.
  $(document).on("click", ".wishlist-btn", function (e) {
    e.stopPropagation();
  });

  // Tombol "Lihat Toko Ini" pada kartu menu -> buka Detail Toko
  $(document).on("click", ".menu-toko-link", function (e) {
    e.preventDefault();
    e.stopPropagation();
    openStoreDetail($(this).data("store-id"));
  });

  // Klik kartu toko (Toko Populer maupun hasil pencarian) -> buka Detail Toko
  $(document).on("click", ".store-card", function () {
    openStoreDetail($(this).data("store-id"));
  });

  // Klik kartu menu -> buka Detail Menu
  $(document).on("click", ".menu-card", function () {
    openMenuDetail($(this).data("menu-id"));
  });

  // Klik menu di dalam Detail Toko -> pindah ke Detail Menu
  $(document).on("click", ".mini-menu-card", function () {
    var menuId = $(this).data("menu-id");
    closeStoreDetail();
    openMenuDetail(menuId);
  });

  // Klik info toko di dalam Detail Menu -> pindah ke Detail Toko
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
      store.image_url
        ? '<img src="' + escapeHtml(store.image_url) + '" alt="' + escapeHtml(store.nama) + '">'
        : '<div class="detail-hero-placeholder">Ceritanya Gambar Toko</div>'
    );

    var buka = store.status === "Buka";
    $("#storeDetailStatus")
      .attr("class", "detail-status " + (buka ? "status-open" : "status-closed"))
      .text(buka ? "Buka sekarang" : "Tutup");
    $("#storeDetailNama").text(store.nama);
    $("#storeDetailAlamat").text(store.alamat || "-");
    $("#storeDetailRating").html("★ " + (store.rating || 0));
    $("#storeDetailUlasan").text((store.ulasan_count || 0) + " ulasan");
    $("#storeDetailJam").text(store.jam_buka || "-");
    $("#storeDetailJarak").text(store.jarak || "-");

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
            (m.image_url
              ? '<img src="' + escapeHtml(m.image_url) + '" alt="' + escapeHtml(m.nama) + '">'
              : '<div class="mini-menu-img-placeholder"></div>') +
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
      menu.image_url
        ? '<img src="' + escapeHtml(menu.image_url) + '" alt="' + escapeHtml(menu.nama) + '">'
        : '<div class="detail-hero-placeholder">Ceritanya Gambar Menu</div>'
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

  /* ---------- Auth: register submit ---------- */

  $("#registerForm").on("submit", function (e) {
    e.preventDefault();
    $("#authError").removeClass("show").text("");

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
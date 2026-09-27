$(function () {
// placeholder
  var tokoPopuler = [
    { nama: "Es Pisang Ijo Bu Ida", jam: "08.00 - 21.00", rating: "4.8", buka: true },
    { nama: "Pisang Ijo Daeng Sija", jam: "09.00 - 20.00", rating: "4.6", buka: true },
    { nama: "Pisang Ijo Ratu Rasa", jam: "10.00 - 18.00", rating: "4.5", buka: false }
  ];

  var menuUnggulan = [
    { nama: "Pisang Ijo Original", desc: "Saus santan, bubur sumsum", harga: "Rp 15.000" },
    { nama: "Pisang Ijo Cokelat", desc: "Topping cokelat leleh", harga: "Rp 17.000" },
    { nama: "Pisang Ijo Durian", desc: "Dengan durian asli", harga: "Rp 20.000" },
    { nama: "Pisang Ijo Keju", desc: "Taburan keju parut", harga: "Rp 18.000" }
  ];

  var testimoni = [
    { nama: "Rangga", ulasan: "Porem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.", waktu: "2 hari yang lalu" },
    { nama: "Salsabila", ulasan: "Porem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.", waktu: "5 hari yang lalu" },
    { nama: "Fajar", ulasan: "Porem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.", waktu: "1 minggu yang lalu" }
  ];

  var tokoHasil = [
    { nama: "Es Pisang Ijo Bu Ida", alamat: "Jl. Pengayoman, Makassar", jarak: "1.2 km", buka: true, jam: "08.00 - 21.00", rating: "4.8", ulasan: 128 },
    { nama: "Pisang Ijo Daeng Sija", alamat: "Jl. Boulevard, Makassar", jarak: "2.4 km", buka: true, jam: "09.00 - 20.00", rating: "4.6", ulasan: 96 },
    { nama: "Pisang Ijo Ratu Rasa", alamat: "Jl. Sultan Alauddin, Makassar", jarak: "3.1 km", buka: false, jam: "10.00 - 18.00", rating: "4.5", ulasan: 54 }
  ];

  /* ---------- Renderers ---------- */

  function renderTokoPopuler() {
    var $grid = $("#tokoPopulerGrid").empty();
    tokoPopuler.forEach(function (t) {
      var statusClass = t.buka ? "status-open" : "status-closed";
      var statusText = t.buka ? "Buka sekarang" : "Tutup";
      var card = $(
        '<div class="store-card">' +
          '<div class="card-media">Ceritanya gambar lokasi</div>' +
          '<div class="card-body">' +
            '<h3>' + t.nama + '</h3>' +
            '<p class="meta">Jam Buka: ' + t.jam + '</p>' +
            '<p class="' + statusClass + '">' + statusText + '</p>' +
            '<span class="rating">★ ' + t.rating + '</span>' +
          '</div>' +
        '</div>'
      );
      $grid.append(card);
    });
  }

  function renderMenu(list) {
    var $grid = $("#menuGrid").empty();
    list.forEach(function (m) {
      var card = $(
        '<div class="menu-card">' +
          '<div class="card-media">Ceritanya gambar Menu</div>' +
          '<div class="card-body">' +
            '<h3>' + m.nama + '</h3>' +
            '<p class="desc">' + m.desc + '</p>' +
            '<span class="price">' + m.harga + '</span>' +
            '<button class="add-btn" title="Tambah ke keranjang">+</button>' +
          '</div>' +
        '</div>'
      );
      $grid.append(card);
    });
  }

  function renderTestimoni() {
    var $grid = $("#testimoniGrid").empty();
    testimoni.forEach(function (t) {
      var card = $(
        '<div class="testi-card">' +
          '<div class="stars">★★★★★</div>' +
          '<div class="name">' + t.nama + '</div>' +
          '<p>' + t.ulasan + '</p>' +
          '<div class="when">' + t.waktu + '</div>' +
        '</div>'
      );
      $grid.append(card);
    });
  }

  function renderTokoHasil(list) {
    var $grid = $("#tokoHasilGrid").empty();
    list.forEach(function (t) {
      var statusClass = t.buka ? "status-open" : "status-closed";
      var statusText = t.buka ? "Buka" : "Tutup";
      var card = $(
        '<div class="store-card">' +
          '<div class="card-body">' +
            '<h3>' + t.nama + '</h3>' +
            '<p class="meta">' + t.alamat + '</p>' +
            '<p class="meta">Jarak: ' + t.jarak + '</p>' +
            '<p class="' + statusClass + '">' + statusText + ' &middot; ' + t.jam + '</p>' +
            '<span class="rating">★ ' + t.rating + ' (' + t.ulasan + ' ulasan)</span><br>' +
            '<a href="#" class="link-arrow" style="margin-top:10px;display:inline-block;">Lihat Detail</a>' +
          '</div>' +
        '</div>'
      );
      $grid.append(card);
    });
    $("#resultsCount").text(list.length);
  }

  renderTokoPopuler();
  renderMenu(menuUnggulan);
  renderTestimoni();
  renderTokoHasil(tokoHasil);

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

    var filtered = tokoHasil.filter(function (t) {
      var matchNama = !nama || t.nama.toLowerCase().indexOf(nama) !== -1;
      var matchKota = !kota || t.alamat.toLowerCase().indexOf(kota) !== -1;
      var matchStatus =
        status === "Semua Status" ||
        (status === "Buka" && t.buka) ||
        (status === "Tutup" && !t.buka);
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

  /* ---------- Demo buttons (no backend, just UX feedback) ---------- */

  /* ---------- Tulis Ulasan (review) ---------- */

  function openReviewModal() {
    if (!currentUser) {
      closeAuthModal();
      openAuthModal("login");
      return;
    }
    $("#reviewError").removeClass("show").text("");
    $("#reviewSuccess").removeClass("show").text("");
    $("#reviewForm").show();
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

  $("#reviewForm").on("submit", function (e) {
    e.preventDefault();
    $("#reviewError").removeClass("show").text("");

    var payload = {
      ulasan: $("#reviewText").val().trim(),
      stars: $("#reviewStars").val(),
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
          return { nama: t.nama, ulasan: t.ulasan, waktu: t.waktu, stars: t.stars };
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
      var card = $(
        '<div class="testi-card">' +
          '<div class="stars">' + stars + '</div>' +
          '<div class="name">' + t.nama + '</div>' +
          '<p>' + t.ulasan + '</p>' +
          '<div class="when">' + t.waktu + '</div>' +
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
    } else {
      $area.append(
        '<button class="btn btn-outline-light" id="loginBtn">Login / Sign In</button>'
      );
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
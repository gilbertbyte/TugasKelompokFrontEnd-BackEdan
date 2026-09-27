$(function () {

  var IS_LOGGED_IN = false;

  function firstImage(raw) {
    var arr = raw;
    if (typeof raw === "string" && raw) {
      try { arr = JSON.parse(raw); } catch (e) { arr = []; }
    }
    if (!Array.isArray(arr)) return null;
    return arr[0] || null;
  }

  function escapeHtml(str) {
    return $("<div>").text(str == null ? "" : str).html();
  }

  function openModal(mode) {
    $("#loginError, #registerError").text("");
    if (mode === "register") {
      $("#loginFormWrap").hide();
      $("#registerFormWrap").show();
    } else {
      $("#registerFormWrap").hide();
      $("#loginFormWrap").show();
    }
    $("#authModal").addClass("active");
  }

  function closeModal() {
    $("#authModal").removeClass("active");
  }

  function loginAs(nama, email) {
    IS_LOGGED_IN = true;
    $("#loginBtn").hide();
    $("#userAvatar").text(nama.charAt(0).toUpperCase());
    $("#userDropdownName").text(nama);
    $("#userDropdownEmail").text(email);
    $("#userDropdown").addClass("show");
    $("#navWishlist").show();
    showLoggedInView();
    loadWishlist();
  }

  function logoutUI() {
    IS_LOGGED_IN = false;
    $("#userDropdown").removeClass("show");
    $("#loginBtn").show();
    $("#navWishlist").hide();
    showLoggedOutView();
  }

  function checkLoginStatus() {
    $.get("/api/user/me")
      .done(function (res) {
        if (res.loggedIn) {
          loginAs(res.nama, res.email || "");
        } else {
          showLoggedOutView();
        }
      })
      .fail(function () {
        showLoggedOutView();
      });
  }
  checkLoginStatus();

  $("#loginBtn, #wishlistLoginBtn").on("click", function () {
    openModal("login");
  });

  $("#authModalClose").on("click", closeModal);

  $("#authModal").on("click", function (e) {
    if (e.target === this) closeModal();
  });

  $("#showRegister").on("click", function (e) {
    e.preventDefault();
    openModal("register");
  });

  $("#showLogin").on("click", function (e) {
    e.preventDefault();
    openModal("login");
  });

  $("#loginForm").on("submit", function (e) {
    e.preventDefault();
    var email = $("#loginEmail").val().trim();
    var pass = $("#loginPassword").val();
    if (!email || !pass) {
      $("#loginError").text("Email dan password wajib diisi.");
      return;
    }
    $.ajax({
      url: "/api/user/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ email: email, password: pass }),
    })
      .done(function (res) {
        loginAs(res.nama, res.email || "");
        closeModal();
        $("#loginForm")[0].reset();
      })
      .fail(function (xhr) {
        var msg = (xhr.responseJSON && xhr.responseJSON.error) || "Login gagal.";
        $("#loginError").text(msg);
      });
  });

  $("#registerForm").on("submit", function (e) {
    e.preventDefault();
    var nama = $("#registerNama").val().trim();
    var email = $("#registerEmail").val().trim();
    var pass = $("#registerPassword").val();
    if (!nama || !email || pass.length < 8) {
      $("#registerError").text("Lengkapi semua kolom (password minimal 8 karakter).");
      return;
    }
    $.ajax({
      url: "/api/user/register",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ nama: nama, email: email, password: pass }),
    })
      .done(function (res) {
        loginAs(res.nama, res.email || "");
        closeModal();
        $("#registerForm")[0].reset();
      })
      .fail(function (xhr) {
        var msg = (xhr.responseJSON && xhr.responseJSON.error) || "Registrasi gagal.";
        $("#registerError").text(msg);
      });
  });

  $("#switchAccountBtn").on("click", function () {
    $.post("/api/user/logout").always(function () {
      logoutUI();
      openModal("login");
    });
  });

  $("#logoutUserBtn").on("click", function () {
    $.post("/api/user/logout").always(logoutUI);
  });

  function showLoggedInView() {
    $("#wishlistLoggedOut").hide();
    $("#wishlistLoggedIn").show();
  }

  function showLoggedOutView() {
    $("#wishlistLoggedIn").hide();
    $("#wishlistLoggedOut").show();
  }

  function wishlistBtnHtml(type, id) {
    return '<button class="wishlist-btn saved" data-type="' + type + '" data-id="' + id + '" title="Hapus dari List">♥</button>';
  }

  function loadWishlist() {
    $.get("/api/wishlist")
      .done(function (data) {
        var menu = data.menu || [];
        var stores = data.stores || [];

        var $menuGrid = $("#wishlistMenuGrid").empty();
        menu.forEach(function (m) {
          var img = firstImage(m.images);
          var media = img
            ? '<div class="card-media"><img src="' + escapeHtml(img) + '" alt="' + escapeHtml(m.nama) + '"></div>'
            : '<div class="card-media">Ceritanya gambar Menu</div>';
          $menuGrid.append(
            '<div class="menu-card">' +
              media +
              '<div class="card-body">' +
                wishlistBtnHtml("menu", m.id) +
                "<h3>" + escapeHtml(m.nama) + "</h3>" +
                '<p class="desc">' + escapeHtml(m.store_nama ? "Dari: " + m.store_nama : (m.deskripsi || "")) + "</p>" +
                '<span class="price">' + escapeHtml(m.harga || "") + "</span>" +
              "</div>" +
            "</div>"
          );
        });

        var $storeGrid = $("#wishlistStoreGrid").empty();
        stores.forEach(function (t) {
          var img = firstImage(t.images);
          var media = img
            ? '<div class="card-media"><img src="' + escapeHtml(img) + '" alt="' + escapeHtml(t.nama) + '"></div>'
            : '<div class="card-media">Ceritanya gambar lokasi</div>';
          $storeGrid.append(
            '<div class="store-card">' +
              media +
              '<div class="card-body">' +
                wishlistBtnHtml("store", t.id) +
                "<h3>" + escapeHtml(t.nama) + "</h3>" +
                '<p class="meta">' + escapeHtml(t.alamat || "") + "</p>" +
              "</div>" +
            "</div>"
          );
        });

        $("#wishlistEmpty").toggle(menu.length === 0 && stores.length === 0);
      });
  }

  $(document).on("click", ".wishlist-btn", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!IS_LOGGED_IN) {
      openModal("login");
      return;
    }
    var $btn = $(this);
    var type = $btn.data("type");
    var id = $btn.data("id");

    $.ajax({ url: "/api/wishlist/" + type + "/" + id, method: "DELETE" }).done(function () {
      loadWishlist();
    });
  });

});
$(function () {

  var STATE = { stores: [], menu: [], testimonials: [], faqs: [] };
  var WISHLIST_IDS = { menu: {}, store: {} };
  var IS_LOGGED_IN = false;

  

  $.get("/api/site-content")
    .done(function (data) {
      applyContent(data.content || {});
      STATE.stores = data.stores || [];
      STATE.menu = data.menu || [];
      STATE.testimonials = data.testimonials || [];
      STATE.faqs = data.faqs || [];

      renderTokoPopuler(STATE.stores.slice(0, 3));
      renderMenu(STATE.menu);
      renderTestimoni(STATE.testimonials);
      renderTokoHasil(STATE.stores);
      renderFaqs(STATE.faqs);
    })
    .fail(function () {
      console.error("Could not load site content from the server.");
    });

  checkLoginStatus();

  

  function applyContent(c) {
    if (c.site) {
      $("#pageTitle").text(c.site.site_title + " — Platform Kuliner Makassar");
      $("#siteLogo, #footerLogo").text(c.site.logo_text);
    }
    if (c.hero) {
      $("#heroBadge").text(c.hero.badge);
      $("#heroHeading").text(c.hero.heading);
      $("#heroSubheading").text(c.hero.subheading);
      $("#heroSearchInput").attr("placeholder", c.hero.search_placeholder);
      $("#heroCtaPrimary").text(c.hero.cta_primary);
      $("#heroCtaSecondary").text(c.hero.cta_secondary);
    }
    if (c.toko_populer) {
      $("#tokoPopulerHeading").text(c.toko_populer.heading);
      $("#tokoPopulerSub").text(c.toko_populer.subheading);
      $("#tokoPopulerLink").text(c.toko_populer.link_text);
    }
    if (c.menu_section) {
      $("#menuSectionHeading").text(c.menu_section.heading);
      $("#menuSectionSub").text(c.menu_section.subheading);
    }
    if (c.about) {
      if (c.about.image_url) {
        $("#aboutMediaText").parent().html(
          '<img src="' + escapeHtml(c.about.image_url) + '" alt="Tentang Pisang Ijo" style="width:100%;height:100%;object-fit:cover;border-radius:24px;">'
        );
      } else {
        $("#aboutMediaText").text(c.about.media_text);
      }
      $("#aboutEyebrow").text(c.about.eyebrow);
      $("#aboutHeading").text(c.about.heading);
      $("#aboutDescription").text(c.about.description);
      $("#aboutPill1").text(c.about.pill_1);
      $("#aboutPill2").text(c.about.pill_2);
      $("#aboutPill3").text(c.about.pill_3);
    }
    if (c.history) {
      $("#historyHeading").text(c.history.heading);
      $("#historyText").text(c.history.text);
    }
    if (c.testimonial_section) {
      $("#testimonialEyebrow").text(c.testimonial_section.eyebrow);
      $("#testimonialHeading").text(c.testimonial_section.heading);
      $("#tulisUlasanBtn").text(c.testimonial_section.cta);
    }
    if (c.cari_toko) {
      $("#cariTokoEyebrow").text(c.cari_toko.eyebrow);
      $("#cariTokoHeading").text(c.cari_toko.heading);
      $("#cariTokoSub").text(c.cari_toko.subheading);
    }
    if (c.faq_section) {
      $("#faqEyebrow").text(c.faq_section.eyebrow);
      $("#faqHeading").text(c.faq_section.heading);
    }
    if (c.contact) {
      $("#contactEyebrow").text(c.contact.eyebrow);
      $("#contactHeading").text(c.contact.heading);
      $("#contactEmail").text("Email support demo : " + c.contact.email);
      $("#contactWhatsapp").text(c.contact.whatsapp);
      $("#contactNote").text(c.contact.note);
      $("#contactHours").text(c.contact.hours);
    }
    if (c.footer) {
      $("#footerTagline").text(c.footer.tagline);
      $("#footerSocial").text(c.footer.social_text);
      $("#footerHelpEmail").text(c.footer.help_email);
      $("#footerHelpWhatsapp").text("WhatsApp CS demo: " + c.footer.help_whatsapp);
      $("#footerLegalTerms").text(c.footer.legal_terms_label);
      $("#footerLegalPrivacy").text(c.footer.legal_privacy_label);
      $("#footerCopyright").html("&copy; " + c.footer.copyright);
    }
  }

  

  function wishlistBtnHtml(type, id) {
    var isSaved = !!WISHLIST_IDS[type][id];
    return '<button class="wishlist-btn' + (isSaved ? ' saved' : '') + '" data-type="' + type + '" data-id="' + id + '" title="Simpan ke List">' + (isSaved ? "♥" : "♡") + '</button>';
  }

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
        '<div class="store-card" style="position:relative;">' +
        wishlistBtnHtml("store", t.id) +
        media +
         '<div class="card-body">' +
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
      $grid.append(
        '<div class="menu-card">' +
          wishlistBtnHtml("menu", m.id) +
          media +
          '<div class="card-body">' +
            "<h3>" + escapeHtml(m.nama) + "</h3>" +
            '<p class="desc">' + escapeHtml(m.deskripsi || "") + "</p>" +
            '<span class="price">' + escapeHtml(m.harga || "") + "</span>" +
            '<button class="add-btn" title="Tambah ke keranjang">+</button>' +
          "</div>" +
        "</div>"
      );
    });
  }

  function renderTestimoni(list) {
    var $grid = $("#testimoniGrid").empty();
    list.forEach(function (t) {
      var stars = Math.max(0, Math.min(5, t.stars || 5));
      $grid.append(
        '<div class="testi-card">' +
          '<div class="stars">' + "★".repeat(stars) + "</div>" +
          '<div class="name">' + escapeHtml(t.nama) + "</div>" +
          "<p>" + escapeHtml(t.ulasan || "") + "</p>" +
          '<div class="when">' + escapeHtml(t.waktu || "") + "</div>" +
        "</div>"
      );
    });
  }

  function renderTokoHasil(list) {
    var $grid = $("#tokoHasilGrid").empty();
    list.forEach(function (t) {
      var buka = t.status === "Buka";
      var statusClass = buka ? "status-open" : "status-closed";
      $grid.append(
        '<div class="store-card" style="position:relative;">' +
          wishlistBtnHtml("store", t.id) +
          '<div class="card-body">' +
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

  function renderFaqs(list) {
    var $wrap = $("#faqAccordion").empty();
    list.forEach(function (f) {
      var $item = $(
        '<div class="accordion-item">' +
          '<button class="accordion-trigger">' + escapeHtml(f.question) + "</button>" +
          '<div class="accordion-panel"><p>' + escapeHtml(f.answer || "") + "</p></div>" +
        "</div>"
      );
      $wrap.append($item);
    });
    bindAccordion();
  }

  function escapeHtml(str) {
    return $("<div>").text(str == null ? "" : str).html();
  }

  

  $("#heroSearchForm").on("submit", function (e) {
    e.preventDefault();
    var q = $("#heroSearchInput").val().trim();
    $("#filterNama").val(q);
    $("html, body").animate({ scrollTop: $("#cari-toko").offset().top - 80 }, 400);
    applyFilter();
  });

  

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

  

  $(document).on("click", ".add-btn", function () {
    var $btn = $(this);
    $btn.text("✓");
    setTimeout(function () { $btn.text("+"); }, 900);
  });

  

  function bindAccordion() {
    $(".accordion-trigger").off("click").on("click", function () {
      var $item = $(this).closest(".accordion-item");
      var $panel = $item.find(".accordion-panel");
      var isOpen = $item.hasClass("open");

      $(".accordion-item").removeClass("open").find(".accordion-panel").css("max-height", 0);

      if (!isOpen) {
        $item.addClass("open");
        $panel.css("max-height", $panel.prop("scrollHeight") + "px");
      }
    });
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
    loadWishlistIds();
  }

  function logoutUI() {
    IS_LOGGED_IN = false;
    WISHLIST_IDS = { menu: {}, store: {} };
    $("#userDropdown").removeClass("show");
    $("#loginBtn").show();
    $("#navWishlist").hide();
    $("#wishlist").hide();
    renderMenu(STATE.menu);
    renderTokoPopuler(STATE.stores.slice(0, 3));
    renderTokoHasil(STATE.stores);
  }

  function checkLoginStatus() {
    $.get("/api/user/me")
      .done(function (res) {
        if (res.loggedIn) {
          loginAs(res.nama, res.email);
        }
      });
  }

  $("#loginBtn").on("click", function () {
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
        loginAs(res.nama, res.email);
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
        loginAs(res.nama, res.email);
        closeModal();
        $("#registerForm")[0].reset();
      })
      .fail(function (xhr) {
        var msg = (xhr.responseJSON && xhr.responseJSON.error) || "Registrasi gagal.";
        $("#registerError").text(msg);
      });
  });

  $("#switchAccountBtn").on("click", function () {
    $.post("/api/user/logout", function () {
      logoutUI();
      openModal("login");
    });
  });

  $("#logoutUserBtn").on("click", function () {
    $.post("/api/user/logout", function () {
      logoutUI();
    });
  });

  $("#tulisUlasanBtn").on("click", function () {
    alert("Demo: form Tulis Ulasan akan tampil di sini.");
  });

  

  function loadWishlistIds() {
    $.get("/api/wishlist/ids")
      .done(function (rows) {
        WISHLIST_IDS = { menu: {}, store: {} };
        rows.forEach(function (r) {
          WISHLIST_IDS[r.item_type][r.item_id] = true;
        });
        renderMenu(STATE.menu);
        renderTokoPopuler(STATE.stores.slice(0, 3));
        renderTokoHasil(STATE.stores);
        loadWishlistSection();
      });
  }

  function loadWishlistSection() {
    $.get("/api/wishlist")
      .done(function (data) {
        var menu = data.menu || [];
        var stores = data.stores || [];

        var $menuGrid = $("#wishlistMenuGrid").empty();
        menu.forEach(function (m) {
          var media = m.image_url
            ? '<div class="card-media"><img src="' + escapeHtml(m.image_url) + '" alt="' + escapeHtml(m.nama) + '"></div>'
            : '<div class="card-media">Ceritanya gambar Menu</div>';
          $menuGrid.append(
            '<div class="menu-card">' +
              wishlistBtnHtml("menu", m.id) +
              media +
              '<div class="card-body">' +
                "<h3>" + escapeHtml(m.nama) + "</h3>" +
                '<p class="desc">' + escapeHtml(m.store_nama ? "Dari: " + m.store_nama : (m.deskripsi || "")) + "</p>" +
                '<span class="price">' + escapeHtml(m.harga || "") + "</span>" +
              "</div>" +
            "</div>"
          );
        });

        var $storeGrid = $("#wishlistStoreGrid").empty();
        stores.forEach(function (t) {
          var media = t.image_url
            ? '<div class="card-media"><img src="' + escapeHtml(t.image_url) + '" alt="' + escapeHtml(t.nama) + '"></div>'
            : '<div class="card-media">Ceritanya gambar lokasi</div>';
          $storeGrid.append(
            '<div class="store-card" style="position:relative;">' +
              wishlistBtnHtml("store", t.id) +
              media +
              '<div class="card-body">' +
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
    var isSaved = !!WISHLIST_IDS[type][id];

    if (isSaved) {
      $.ajax({ url: "/api/wishlist/" + type + "/" + id, method: "DELETE" }).done(function () {
        delete WISHLIST_IDS[type][id];
        loadWishlistIds();
      });
    } else {
      $.ajax({
        url: "/api/wishlist",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ item_type: type, item_id: id }),
      }).done(function () {
        WISHLIST_IDS[type][id] = true;
        loadWishlistIds();
      });
    }
  });

  $("#navWishlist").on("click", function () {
    $("#wishlist").show();
  });

});
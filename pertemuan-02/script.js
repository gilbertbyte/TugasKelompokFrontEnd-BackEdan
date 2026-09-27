$(document).ready(function () {

  /* =========================================================
     1. TOGGLE MENU MOBILE
     - Selector & event handling: $('.nav-burger').on('click', ...)
     - Manipulasi class: .toggleClass('nav-open')
     ========================================================= */
  $('.nav-burger').on('click', function () {
    $('.main-nav').toggleClass('nav-open');
  });

  // Tutup menu mobile otomatis begitu salah satu link nav diklik
  $('.main-nav a').on('click', function () {
    $('.main-nav').removeClass('nav-open');
  });


  /* =========================================================
     2. ACCORDION FAQ
     - Selector & event handling: $('.faq-question').on('click', ...)
     - Manipulasi DOM/class: .closest(), .siblings(), .toggleClass('active')
     - Efek/animasi: .slideToggle() dan .slideUp()
     ========================================================= */
  $('.faq-question').on('click', function () {
    const $item = $(this).closest('.faq-item');
    const $answer = $(this).siblings('.faq-answer');

    // Tutup FAQ lain yang sedang terbuka (hanya 1 jawaban boleh terbuka sekaligus)
    $('.faq-item').not($item).removeClass('active')
      .find('.faq-answer').slideUp(200);

    // Buka/tutup jawaban FAQ yang baru saja diklik
    $item.toggleClass('active');
    $answer.slideToggle(200);
  });


  /* =========================================================
     3. TOMBOL SUKA + PENGHITUNG PADA TIAP MENU (fitur tambahan #1)
     - Selector & event handling: $('.like-btn').on('click', ...)
     - Manipulasi DOM: .text() untuk update angka, .toggleClass('liked')
     ========================================================= */
  $('.like-btn').on('click', function () {
    const $btn = $(this);
    const $count = $btn.find('.like-count');
    const $icon = $btn.find('.like-icon');

    // Ambil angka saat ini, ubah ke number pakai parseInt
    let currentLikes = parseInt($count.text(), 10);

    if ($btn.hasClass('liked')) {
      // Sudah disuka -> klik lagi berarti batal suka
      currentLikes -= 1;
      $icon.text('♡');
    } else {
      // Belum disuka -> tambah 1 like
      currentLikes += 1;
      $icon.text('♥');
    }

    $btn.toggleClass('liked');
    $count.text(currentLikes);
  });


  /* =========================================================
     4. TOMBOL KEMBALI KE ATAS (fitur tambahan #2)
     - Selector & event handling: $(window).on('scroll', ...), $('#back-to-top').on('click', ...)
     - Efek/animasi: .fadeIn() / .fadeOut(), animate() untuk smooth scroll
     ========================================================= */
  $(window).on('scroll', function () {
    // Muncul setelah user scroll lebih dari 300px dari atas
    if ($(window).scrollTop() > 300) {
      $('#back-to-top').fadeIn(200);
    } else {
      $('#back-to-top').fadeOut(200);
    }
  });

  $('#back-to-top').on('click', function () {
    // Animasi scroll halus kembali ke posisi paling atas
    $('html, body').animate({ scrollTop: 0 }, 400);
  });

});
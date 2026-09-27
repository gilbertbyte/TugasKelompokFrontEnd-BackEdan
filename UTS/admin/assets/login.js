$(function () {
  $("#loginForm").on("submit", function (e) {
    e.preventDefault();
    $("#loginError").text("");

    var username = $("#username").val().trim();
    var password = $("#password").val();

    $.ajax({
      url: "/admin/auth/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ username: username, password: password }),
    })
      .done(function (res) {
        window.location.href = res.redirect || "/admin";
      })
      .fail(function (xhr) {
        var msg = "Sign-in failed. Please try again.";
        if (xhr.responseJSON && xhr.responseJSON.error) msg = xhr.responseJSON.error;
        $("#loginError").text(msg);
      });
  });
});

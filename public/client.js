// from: https://stackoverflow.com/questions/7731778/jquery-get-query-string-parameters
$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

$(function(){
	$('.alert').hide();
	$('form').on('submit', function(event){
		event.preventDefault();

		var form = $(this);
		var formData = form.serialize();

		$('.alert').hide().removeClass('bg-danger').removeClass('bg-info');

		if (form.attr('name') === 'signup') {
			//Signup form.. call //users
			$.ajax({ type: 'POST', url: '/users', data: formData})
			.success(function(user){
				console.log(user);
				if (user.status === "pending-user") {
					var alertText = 'Please see your email to confirm your address. ' + user.message;
					$('.alert').html(alertText).addClass('bg-info');
					$('.alert').show();
				}
				form.trigger('reset');
			})
			.error(function(errorData){
				$('.alert').html(errorData.responseText).addClass('bg-danger');
				$('.alert').show();
			});
		}

		if (form.attr('name') === 'admin-login') {
			//Login form.. get/store token and redirect

			console.log('Doing login');
			console.log('Data: ' + formData);

			$.ajax({ type: 'POST', url: '/users/authenticate', data:formData})
			.success(function(response){
				//store token and redirect
				console.log(response.token);
				window.sessionStorage.token = response.token;
				document.cookie="token=" + response.token;
				//$.cookie('token', response.token);
				var redirectUrl = $.getUrlVar('redirect');
				if (redirectUrl) {
					window.location.replace(redirectUrl);
				} else {
					window.location.replace('/');
				}
			})
			.error(function(error){
				console.log(error);
				var errorResponseText = JSON.parse(error.responseText);
				$('.alert').html(errorResponseText.message).addClass('bg-danger');
				$('.alert').show();
			})
		}
	});
});
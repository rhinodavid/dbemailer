$(function(){
	$('.alert').hide();
	$('form').on('submit', function(event){
		event.preventDefault();

		var form = $(this);
		var userData = form.serialize();
		console.log(userData);

		$('.alert').hide().removeClass('bg-danger').removeClass('bg-info');

		$.ajax({
			type: 'POST', url: '/users', data: userData
		})
		.success(function(user){
			console.log(user);
			if (user.status === "pending-user") {
				$('.alert').html('Please see your email to confirm your address.').addClass('bg-info');
				$('.alert').show();
			}
			form.trigger('reset');
		})
		.error(function(errorData){
			$('.alert').html(errorData.responseText).addClass('bg-danger');
			$('.alert').show();
		});
	});
});
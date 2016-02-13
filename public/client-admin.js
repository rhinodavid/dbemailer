

$(function(){

	$('a#logout-link').click(function(e){
		logout();
	});

	$('.alert').hide();

	$('form').on('submit', function(event){
		event.preventDefault();

		var form = $(this);
		var formData = form.serialize();

		$('.alert').hide().removeClass('bg-danger').removeClass('bg-info');
		
		if (form.attr('name') === 'password-change') {
			// ********** PASSWORD CHANGE *************

			// Check to make sure password and confirmation match
			//console.log(form.find('input[name="new-password"]').val());

			if (form.find('input[name="new-password"]').val() != form.find('input[name="new-password-confirm"]').val()) {
				$('.alert').show().addClass('bg-danger').html("Your passwords do not match");
				form.trigger('reset');
			} else {
				// Send new password to endpoint
				var token = getCookie('token');
				var decoded = jwt_decode(token);
				var id = decoded._id;
				console.log(id);

				$('.alert').hide().removeClass('bg-danger').removeClass('bg-info');
				$.ajax({
					type: 'PUT',
					url: '/users/' + id,
					data: {
						"password": form.find('input[name="new-password"]').val()
					}
				}).success(function(response){
					$('.alert').show().addClass('bg-success').html("Your password was updated");
				})
				.error(function(error){
					var errorObj = JSON.parse(error.responseText);
					$('.alert').show().addClass('bg-danger').html(errorObj.message);
				});

			}

		}
	});

	//grab all the users
	$.get('/users', appendUsers);

	function appendUsers(users){
		var list = [];
		var content, user;
		for(var i in users) {
			user = users[i];
			content = '<span><b>' + user.name;
			if (user.admin) {
				content += " (administrator)";
			}
			content +='</b></span>&nbsp;&nbsp;&nbsp;&nbsp;';
			content += '<span><small>' + user.email + '</small></span>&nbsp;&nbsp;&nbsp;&nbsp;';
			content += '<a href="#" id="status-change-link" data-userid="' + user._id + '"><span><small>' + user.status + '</small></span></a>&nbsp;&nbsp;&nbsp;&nbsp;';
			content += '<a href="#" id="delete-button" data-userid="' + user._id + '"><img src="/delete.png" width="15px"></img></a>';
			list.push($('<li>', { html: content }));
		}
		$('.user-list').append(list);
	}

	$('.user-list').on('click', '#delete-button', 'a[data-userid]', function (event){
		//if(!confirm('Are you sure you want to delete user?')){
		//	return false;
		//}
		var target = $(event.currentTarget);

		$.ajax({
			type: 'DELETE',
			url: '/users/' + target.data('userid'),
		}).done(function(){
			target.parents('li').remove();
		});
	});

	$('.user-list').on('click', '#status-change-link', 'a[data-userid]', function (event){
		var target = $(event.currentTarget);
		var status = target.text();
		if (status == "pending-admin") {
			//change user's status to confirmed
		}
		
		$.ajax({
			type: 'PUT',
			url: '/users/' + target.data('userid'),
			data: {
				"status": "confirmed"
			}
		}).success(function(response){
			target.text(response.status);
		});

	});

	// CONFIGURE THE DROPBOX CONNECT BUTTON
	$.ajax({
		type: 'GET',
		url: '/db/dbauthurl'
	}).done(function(response){
		$('a#db-connect').attr("href", response);
	});

	// SHOW THE CONNECTED DROPBOX DATA
	$.ajax({
		type: "GET",
		url: '/db/accountinfo'
	}).error(function(response){
		// Show a no dropbox connected notification
		$('#dropbox-info').html("<span class='text-warning'>No Dropbox connected</span>");
	}).success(function(response){
		// Display the dropbox info
		var data = jQuery.parseJSON(response);
		var name = data.name.display_name;
		var email = data.email;
		$('#dropbox-info').html("<h5>"+name+"</h5><span class='small muted'>"+email+"</span>");
	});
});

function logout() {
	document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
	localStorage.removeItem("token");
	window.location = "/admin";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}


$(function(){
	$('.alert').hide();

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
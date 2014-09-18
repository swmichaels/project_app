(function() {
  //$('#zendeskSelect option[value="48491"]').attr('selected', 'selected');
  //build a group object for looking up a group name from id
  var buildGroupList = function(item) {
      this.groups[item.id] = item.name;
      //build an array for the ticket submit pages to create dropdown list
      this.groupDrop.push({
        'label': '' + item.name + '',
        'value': '' + item.id + ''
      });
    };
  //build a agent object for looking up a agent name from id
  var buildAgentList = function(item) {
      this.assignees[item.id] = item.name;
    };
  //build a list of tickets in the project
  var buildTicketList = function(item) {
      //push a objects into a array for the ticket list page
      var list = {
        'id': '' + item.id + '',
        'status': '' + item.status + '',
        'type': '' + item.type + '',
        'assignee_id': '' + this.assigneeName(item.assignee_id) + '',
        'group_id': '' + this.groupName(item.group_id) + '',
        'subject': '' + item.subject
      };
      var hasProjectChildTag = _.include(item.tags, 'project_child');
      if (hasProjectChildTag) {
        if ((this.isSolvable === true) && !(_.include(this.whatIsSolved, item.status))) {
          this.isSolvable = false;
        }
        //if the ticket is a child ticket set the selected to false
        list.selected = !hasProjectChildTag;
      } else {
        // selected is true if the ticket is the parent
        list.selected = true;
      }
      this.ticketList.push(list);
    };
  var buildTicketFormList = function(item) {
    if(!item.active){ return; }
      this.ticketForms[item.id] = item.ticket_field_ids;
      this.ticketForms[item.id].name = item.name;
      if(this.ticket().form().id() === item.id ) {
        this.ticketForms[item.id].selected = true;
      }
      // get default ticket form ID as necessary
      if (item['default']) {
        this.defaultTicketFormID = item.id;
      }
    };
  var buildTicketFieldList = function(item) {
    // get default ticket form ID as necessary
    if (item.active && item.removable === true) {
      if(_.indexOf(this.ticketFieldList, item.id) === -1) {
        switch(item.type){
          case 'text':
            item.text = true;
            break;
          case 'textarea':
            item.textarea = true;
            break;
          case 'tagger':
            item.tagger = true;
            break;
          case 'checkbox':
            item.checkbox = true;
            break;
          case 'date':
            item.date = true;
            break;
          case 'integer':
            item.integer = true;
            break;
          case 'decimal':
            item.decimal = true;
            break;
          case 'regexp':
            item.regexp = true;
            break;
          default:
            item.system = true;
        }
        this.ticketFieldList.push(item.id);
        this.ticketFieldObj.push(item);
      }
    }
    this.ticketForms['1'] = this.ticketFieldList;
    this.defaultTicketFormID = 1;
  };

  return {
    appID: 'ProjectApp',
    defaultState: 'noproject',
    name: '',
    prependSubject: '',
    appendSubject: '',
    groups: {},
    assignees: {},
    ticketForms: {},
    groupDrop: [],
    ticketList: [],
    createResultsData: [],
    isSolvable: true,
    whatIsSolved: ['closed', 'solved'],
    MAX_ATTEMPTS: 20,
    defaultTicketFormID: '',
    currentTicketformID: '',
    ticketFieldList: [],
    ticketFieldObj: [],
    currentTicket: {},

    events: {
      // Lifecycle
      'app.activated': 'init',
      'requiredProperties.ready': 'getProjectData',
      'ticket.form.id.changed': function() {
        this.currentTicketformID = this.ticket().form().id();
        _.defer(this.projectNameFieldExist.bind(this));
      },
      // DOM events
      'click .submitSpoke': 'createTicketValues',
      'click .makeproj': 'listProjects',
      'click .submitBulk': 'createBulkTickets',
      'click .displayForm': 'switchToReqester',
      'click .displayList': 'updateList',
      'click .displayMultiCreate': 'switchToBulk',
      'click .displayUpdate': 'switchToUpdate',
      'click .updateticket': 'updateTickets',
      'click .removeTicket': 'removeFrom',
      'change #zendeskForm': 'formSelected',
      'change #zenType': 'showDate',
     //place preset template buttons here

      // Requests
      'createTicket.done': 'processData',
      'getGroups.done': 'processGroups',
      'getAgents.done': 'processAgents',
      'getTicketForms.done': 'processTicketForms',
      'getTicketForms.fail': 'getTicketFieldsData',
      'getExternalID.done': 'findProjects',
      'getTicketFields.done': 'processTicketFields',
      'searchExternalID.done': function(data) {
        this.listProjects(data || {});
      }
      // Hooks
    },
    //end events
    requests: {
      createTicket: function(childCall) {
        return {
          url: '/api/v2/tickets.json',
          dataType: 'JSON',
          type: 'POST',
          contentType: 'application/json',
          data: childCall,
          proxy_v2: true
        };
      },
      getGroups: function(page) {
        return {
          url: '/api/v2/groups.json?page=' + page,
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      },
      putExternalID: function(data, id) {
        return {
          url: '/api/v2/tickets/' + id + '.json',
          dataType: 'JSON',
          type: 'PUT',
          contentType: 'application/json',
          data: data,
          proxy_v2: true
        };
      },
      getExternalID: function(ticket) {
        return {
          url: '/api/v2/tickets/' + ticket + '.json',
          dataType: 'JSON',
          type: 'GET',
          contentType: 'application/json',
          proxy_v2: true
        };
      },
      autocompleteRequester: function(email) {
        return {
          url: '/api/v2/users/autocomplete.json?name=' + email,
          type: 'POST',
          proxy_v2: true
        };
      },
      searchExternalID: function(data, page) {
        return {
          url: '/api/v2/tickets.json?external_id=' + data + '&page=' + page + '&per_page=50',
          dataType: 'JSON',
          type: 'GET',
          contentType: 'application/json',
          proxy_v2: true
        };
      },
      getAgents: function(page) {
        return {
          url: '/api/v2/users.json?page=' + page + '&role%5B%5D=4&role%5B%5D=2',
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      },

      getTicketForms: function() {
        return {
          url: '/api/v2/ticket_forms.json',
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      },
      getTicketFields: function() {
        return {
          url: '/api/v2/ticket_fields.json',
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      }
    },
    //end requests
    init: function() {
      this.getTicketFormData(1);
    },
    // presetTemplate: function(){
    //   var settings = JSON.parse(this.settings.settingsMap);
    //   console.log('fields ', settings.template.fields);
    //   this.setGroups(settings.template.groups);
    //   this.setFields(settings.template.fields);
    // },

    setGroups: function(arrGroups){
      arrGroups.forEach(function(x){
        this.$('#zendeskSelect option[value="'+ x+'"]').attr('selected', 'selected');
      }, this);
    },
    setFields: function(arrFields){
      arrFields.forEach(function(x){
        this.$('#' + x.id).val(x.value);
      });
    },
    processData: function(data, response, responseText) {
      this.ticket().tags().add(['project_parent', 'project_' + this.ticket().id()]);
      this.ticket().customField('custom_field_' + this.settings.Custom_Field_ID + '', 'Project-' + this.ticket().id());
      if(data !== undefined) {
      this.createResultsData.push({
        'id': '' + data.ticket.id + '',
        'external_id': '' + data.ticket.external_id + ''
      });
      this.switchTo('description', {
        createResult: this.createResultsData
      });

      }
    },
    autocompleteRequesterEmail: function() {
      var self = this;
      // bypass this.form to bind the autocomplete.
      this.$('#userEmail').autocomplete({
        minLength: 3,
        source: function(request, response) {
          self.ajax('autocompleteRequester', request.term).done(function(data) {
            response(_.map(data.users, function(user) {
              return {
                "label": user.name,
                "value": user.email
              };
            }));
          });
        },
        change: function(event, ui) {
          if (_.isNull(ui.item)) {
            self.$('#userName').parent().show();
            self.$('#userName').focus();
          }
        }
      }, this);
    },
    autocompleteGroup: function() {
      var self = this;
      // bypass this.form to bind the autocomplete.
      this.$('#zendeskGroup').autocomplete({
        minLength: 3,
        source: this.groupDrop,
        focus: function(event, ui) {
          self.$("#zendeskGroup").val(ui.item.label);
          return false;
        },
        select: function(event, ui) {
          self.$("#zendeskSelect").val(ui.item.value);
          return false;
        }
      }, this);
    },
    createTicketValues: function() {
      //console.log(this.$('#custom-fields :input').serializeArray());
      var fieldListArray = this.$('#custom-fields :input').serializeArray();
      var ticket = this.ticket();
      var groupSelected = [];
      this.createResultsData = [];
      if (Array.isArray(this.$('#zendeskSelect').val())) {
        groupSelected = this.$('#zendeskSelect').val();
      } else {
        groupSelected.push(this.$('#zendeskSelect').val());
      }
      groupSelected.forEach(function(group) {
        var rootTicket = {};
        rootTicket.ticket = {};
        rootTicket.ticket.ticket_form_id = this.$('#zendeskForm').val();
        rootTicket.ticket.subject = this.$('#userSub').val();
        rootTicket.ticket.due_at = this.$('#dueDate').val();
        rootTicket.ticket.type = this.$('#zenType').val();
        rootTicket.ticket.priority = this.$('#zenPri').val();
        rootTicket.ticket.comment = {};
        rootTicket.ticket.comment.value = this.$('#ticketDesc').val();
        rootTicket.ticket.requester = {};
        if (this.$('#userName').val() !== '') {
          rootTicket.ticket.requester.name = this.$('#userName').val();
        }
        rootTicket.ticket.requester.email = this.$('#userEmail').val();
        rootTicket.ticket.group_id = group;
        rootTicket.ticket.external_id = 'Project-' + ticket.id();
        rootTicket.ticket.tags = ['project_child', 'project_' + ticket.id()];
        rootTicket.ticket.custom_fields = {};
        rootTicket.ticket.custom_fields[this.settings.Custom_Field_ID] = 'Project-' + ticket.id();
        fieldListArray.forEach(function(field){
          rootTicket.ticket.custom_fields[field.name] = field.value;
        }, this);
        var childCall = JSON.stringify(rootTicket);
        this.ajax('createTicket', childCall);
      }, this);
      //for the future
      //ticket.external_id('Project-' + ticket.id());
      var currentTags = this.ticket().tags();
      this.putTicketData(currentTags, 'project_parent', 'add', ticket.id());

    },
    switchToReqester: function() {
      var newSubject = this.ticket().subject();
      var currentForm = this.ticket().form().id();
      var ticketType = this.getTicketType(this.ticket().type());
      var ticketPri = this.getTicketPri(this.ticket().priority());
      if (this.prependSubject) {
        newSubject = 'Project-' + this.ticket().id() + ' ' + newSubject;
      }
      if (this.appendSubject) {
        newSubject = newSubject + ' Project-' + this.ticket().id();
      }
      this.switchTo('requester', {
        ticketForm: this.ticketForms,
        currentForm: currentForm,
        email: this.ticket().requester().email(),
        groups: this.groupDrop,
        subject: newSubject,
        desc: this.ticket().description(),
        ticketType: ticketType,
        ticketPri: ticketPri
      });
      this.$('button.displayList').show();
      this.$('button.displayForm').hide();
      this.$('button.displayMultiCreate').show();
      this.autocompleteRequesterEmail();
      this.autocompleteGroup();
      this.$('#zendeskForm').change();
      this.$('#dueDate').val(this.currentTicket.ticket.due_at).datepicker({ dateFormat: 'yy-mm-dd' });
      if(this.$('#zenType').val() === 'task'){
        this.$('#dueDate').parent().show();
      }
    },
    getProjectData: function() {
      //get all the groups
      this.getGroupsData(1);
      //get all the agents in the system V2 API
      this.getAgentData(1);

      this.prependSubject = this.settings.prependSubject;
      this.appendSubject = this.settings.appendSubject;
      //get the exteranl API on the currently viewed ticket
      this.ajax('getExternalID', this.ticket().id()).done(function(data) {
        this.findProjects(data);
      });
      //get the value of the Project ticket field
      var projectField = this.settings.Custom_Field_ID;
      this.currentTicketformID = this.ticket().form().id() || this.defaultTicketFormID;
      this.projectNameFieldExist();
    },
    getTicketType: function(type){
    var types = [{'title': 'Question', 'value': 'question'},{'title': 'Incident', 'value': 'incident'},{'title': 'Problem', 'value': 'problem'},{'title': 'Task', 'value': 'task'}];
    types.forEach(function(t){
      if(t.value === type){
        t.selected = true;
      }
    });
    return types;
  },
  getTicketPri: function(type){
    var pri = [{'title': 'Low', 'value': 'low'},{'title': 'Normal', 'value': 'normal'},{'title': 'High', 'value': 'high'},{'title': 'Urgent', 'value': 'urgent'}];
    pri.forEach(function(t){
      if(t.value === type){
        t.selected = true;
      }
    });
    return pri;
  },
    // check to see if the custom field for "project name" exist in current form or not
    projectNameFieldExist: function() {
      var thereAreNulls = [undefined, null, ''];
      if (_.indexOf(this.ticketForms[this.currentTicketformID], parseInt(this.settings.Custom_Field_ID, 10)) !== -1) {
        //check to see if the field is there, if it’s there is it empty.
        var isNotEmpty = (_.indexOf(thereAreNulls, this.ticket().customField('custom_field_' + this.settings.Custom_Field_ID + '')) === -1);
        if (isNotEmpty) {
          //if the field contains a value disable editing of the field
          this.ticketFields('custom_field_' + this.settings.Custom_Field_ID + '').disable();
        } else {
          //if it’s not returned or empty hide the field
          this.ticketFields('custom_field_' + this.settings.Custom_Field_ID + '').hide();
        }
      } else {
        // project name custom field ID does not show up in current ticket form
        return;
      }
    },

    findProjects: function(data) {
      this.currentTicket.ticket = data.ticket;
      var thereAreNulls = [undefined, null, ''];
      var isNotEmpty = (_.indexOf(thereAreNulls, data.ticket.external_id) === -1);
      if (isNotEmpty) {
        this.getProjectSearch(data.ticket.external_id, 1);
      }
    },
    getProjectSearch: function(externalID, page) {
      this.ajax('searchExternalID', externalID, page);
    },
    listProjects: function(data) {
      this.ticketList = [];
      var nextPage = 1;
      var btnClicked = (data.type === 'click');
      if (!btnClicked) {
        _.each(data.tickets, buildTicketList, this);
        if (data.next_page !== null) {
          nextPage = nextPage + 1;
          this.getProjectSearch(data.ticket[0].external_id, nextPage);
        }
      }
      this.switchTo('list', {
        projects: this.ticketList
      });
      this.parentSolve();
      //hide the remove button in the template if not child ticket
      this.$('button.child').hide();
      this.$('button.displayList').hide();
      this.$('button.parent').show();
      //if the current ticket is a child hide the create buttons in the template and show the remove
      if (_.indexOf(this.ticket().tags(), 'project_child') !== -1) {
        this.$('button.parent').hide();
        this.$('button.child').show();
      }
    },
    parentSolve: function() {
      //enable solve and if this.isSolvavle is false disable solve
      this.ticketFields('status').options('solved').enable();
      //if this is a child ticket stop and exit function 
      var hasProjectChildTag = _.include(this.ticket().tags(), 'project_child');
      if (hasProjectChildTag) {
        return true;
      }
      if (!this.isSolvable) {
        this.ticketFields('status').options('solved').disable();
      }
    },
    getGroupsData: function(page) {
      if (page === 1 && Object.keys(this.groups).length > 0) {
        return;
      }
      this.ajax('getGroups', page);
    },
    processGroups: function(data) {
      var nextPage = 1;
      _.each(data.groups, buildGroupList, this);
      if (data.next_page !== null) {
        nextPage = nextPage + 1;
        this.getGroupsData(nextPage);
      }
    },
    getAgentData: function(page) {
      if (page === 1 && Object.keys(this.assignees).length > 0) {
        return;
      }
      this.ajax('getAgents', page);
    },
    processAgents: function(data) {
      var nextPage = 1;
      _.each(data.users, buildAgentList, this);
      if (data.next_page !== null) {
        nextPage = nextPage + 1;
        this.getAgentData(nextPage);
      }
    },

    getTicketFormData: function(page) {
      this.ajax('getTicketForms', page);
    },

    processTicketForms: function(data) {
      var nextPage = 1;
      _.each(data.ticket_forms, buildTicketFormList, this);
      if (data.next_page !== null) {
        nextPage = nextPage + 1;
        this.getTicketFormData(nextPage);
      } else {
        this.getProjectData();
      }
    },
    processTicketFields: function(data){
      var nextPage = 1;
      _.each(data.ticket_fields, buildTicketFieldList, this);
      if (data.next_page !== null) {
        nextPage = nextPage + 1;
        this.getTicketFieldsData(nextPage);
      } else {
        this.displayFields = [];
        var selectedFormArray = this.ticketForms[this.$('#zendeskForm').val()];
        this.ticketFieldObj.forEach(function(d){
          if(_.contains(selectedFormArray, d.id)){
            this.displayFields.push(d);
          }
        }, this);
        this.fieldsHTML = this.renderTemplate('_fields', {
        fields: this.displayFields
      });
      this.$('#zendeskForm').after(this.fieldsHTML);
      this.processTicketFieldsData();
      }
    },
    //sets the value of the displayed ticket form in the app
    processTicketFieldsData: function(){
      //grab the custom field div find the input and make an array 
      var fieldListArray = this.$('#custom-fields :input').serializeArray();
      //go through the array of current custom fields. 
      fieldListArray.forEach(function(t){

        this.currentTicket.ticket.custom_fields.forEach(function(x){
          if(this.$('#' + x.id )){
            this.$('#' + x.id ).val(x.value);
          }
        }, this);
      }, this);
    },
    getTicketFieldsData: function(page){
      this.ajax('getTicketFields', page);
    },
    updateList: function() {
      this.ajax('getExternalID', this.ticket().id()).done(function(data) {
        this.findProjects(data);
      });
    },
    groupName: function(groupID) {
      if (groupID === null) {
        return 'None';
      }
      return this.groups[groupID] || 'None';
    },
    assigneeName: function(assigneeID) {
      if (assigneeID === null) {
        return 'None';
      }
      return this.assignees[assigneeID] || 'None';
    },
    formSelected: function(){
      this.$('#custom-fields').remove();
      this.fieldsHTML = '';
      this.getTicketFieldsData();
    },
    todaysDate: function() {
      var today = new Date();
      var dd = this.pad(today.getDate());
      var mm = this.pad(today.getMonth()+1); //January is 0!
      var yyyy = today.getFullYear();
      //return yyyy+'-'+mm+'-'+dd;
      return today;
    },
    pad: function(minutes) {
      var whole;
      if (Number(minutes) < 10) {
        whole = '0' + minutes;
      } else {
        whole = minutes;
      }
      return whole;
    },
    showDate: function(){
      if(this.$('#zenType').val() === 'task'){
        this.$('#dueDate').parent().show();
      }
    },
    switchToBulk: function() {
      var ticketType = this.getTicketType(this.ticket().type());
      var ticketPri = this.getTicketPri(this.ticket().priority());
      var currentForm = this.ticket().form().id();
      this.switchTo('multicreate', {
        ticketForm: this.ticketForms,
        currentForm: currentForm,
        email: this.ticket().requester().email(),
        groups: this.groupDrop,
        subject: this.ticket().subject(),
        desc: this.ticket().description(),
        ticketType: ticketType,
        ticketPri: ticketPri
      });
      this.$('button.displayList').show();
      this.$('button.displayForm').show();
      this.$('button.displayMultiCreate').hide();
      this.autocompleteRequesterEmail();
      this.autocompleteGroup();
      this.$('#zendeskForm').change();
      this.$('#dueDate').val(this.currentTicket.ticket.due_at).datepicker({ dateFormat: 'yy-mm-dd' });
      if(this.$('#zenType').val() === 'task'){
        this.$('#dueDate').parent().show();
      }
    },
    createBulkTickets: function() {
      this.createTicketValues();
    },
    switchToUpdate: function() {
      this.switchTo('updatetickets', {

      });
    },
    updateTickets: function() {
      var re = /,|\s/;
      var list = this.$('#listofIDs').val().split(re);
      //update the the current ticket
      var currentTags = this.ticket().tags();
      this.putTicketData(currentTags, 'project_parent', 'add', this.ticket().id());
      //get the list supplied and update the ticket.
      list.forEach(function(ticket) {
        this.ajax('getExternalID', ticket).done(function(data) {
          if ((data.ticket.status !== 'closed') && (_.indexOf(data.ticket.tags, 'project_child') === -1)) {
            this.putTicketData(data.ticket.tags, 'project_child', 'add', data);
          } else if (data.ticket.status === 'closed') {
            services.notify(data.ticket.id + ' is closed', 'error');
          } else if (_.indexOf(data.ticket.tags, 'project_child') !== -1) {
            services.notify(data.ticket.id + ' is member of another project ' + data.ticket.external_id + ' ', 'error');
          }
        });
      }, this);
    },
    removeFrom: function() {
      this.ajax('getExternalID', this.ticket().id()).done(function(data) {
        this.putTicketData(data.ticket.tags, 'project_child', 'remove', data);
        var projectTag = data.ticket.external_id.replace(/-/i, '_').toLowerCase();
        this.ticket().tags().remove(['project_child', projectTag]);
        this.ticket().customField('custom_field_' + this.settings.Custom_Field_ID + '', '');
      });
    },
    putTicketData: function(tags, linking, type, data) {
      var ticketTags = tags,
        isParent = (_.indexOf(ticketTags, 'project_parent') !== -1),
        ticketUpdateID, updateTicket = {};

      if (_.isObject(data)) {
        ticketUpdateID = data.ticket.id;
      } else {
        ticketUpdateID = data;
      }
      updateTicket.ticket = {};
      updateTicket.ticket.custom_fields = {};
      updateTicket.ticket.custom_fields[this.settings.Custom_Field_ID] = 'Project-' + this.ticket().id();
      updateTicket.ticket.external_id = 'Project-' + this.ticket().id();
      if (!isParent && type === 'add') {
        ticketTags.push(linking, 'project_' + this.ticket().id());
      } else if (!isParent && type === 'remove') {
        var projectTag = data.ticket.external_id.replace(/-/i, '_').toLowerCase();
        ticketTags.splice(_.indexOf(tags, "project_child"), 1);
        ticketTags.splice(_.indexOf(tags, projectTag), 1);
        updateTicket.ticket.custom_fields[this.settings.Custom_Field_ID] = '';
        updateTicket.ticket.external_id = '';
      } else {
        ticketTags.push(linking, 'project_' + this.ticket().id());
      }
      updateTicket.ticket.tags = ticketTags;
      var thisTicket = JSON.stringify(updateTicket);
      this.ajax('putExternalID', thisTicket, ticketUpdateID).done(function(data) {
        this.processData();
      });

    },


    // HELPER FUNCTIONS HELPER FUNCTIONS HELPER FUNCTIONS HELPER FUNCTIONS
    allRequiredPropertiesExist: function() {
      if (this.requiredProperties.length > 0) {
        // console.log ("aa-- this.requiredProperties[0] =", this.requiredProperties[0]);
        var valid = this.validateRequiredProperty(this.requiredProperties[0]);
        // prop is valid, remove from array
        if (valid) {
          this.requiredProperties.shift();
        }
        // console.log ("aa-- this.currAttempt =", this.currAttempt);
        if (this.requiredProperties.length > 0 && this.currAttempt < this.MAX_ATTEMPTS) {
          if (!valid) {
            ++this.currAttempt;
          }

          _.delay(_.bind(this.allRequiredPropertiesExist, this), 100);
          return;
        }
      }
      if (this.currAttempt < this.MAX_ATTEMPTS) {
        this.trigger('requiredProperties.ready');
      } else {
        services.notify("error in allRequiredPropertiesExist!");
      }
    },

    safeGetPath: function(propertyPath) {
      return _.inject(propertyPath.split('.'), function(context, segment) {
        if (context == null) {
          return context;
        }
        var obj = context[segment];
        if (_.isFunction(obj)) {
          obj = obj.call(context);
        }
        return obj;
      }, this);
    },

    validateRequiredProperty: function(propertyPath) {
      if (propertyPath.match(/custom_field/)) {
        return !!this.ticketFields(propertyPath);
      }
      var value = this.safeGetPath(propertyPath);
      return value != null && value !== '' && value !== 'no';
    }
  }; //end first return
}());
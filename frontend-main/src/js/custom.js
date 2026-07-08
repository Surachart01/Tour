/**
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var CURRENT_URL = window.location.href.split('#')[0].split('?')[0],
    $BODY = $('body'),
    $MENU_TOGGLE = $('#menu_toggle'),
    $SIDEBAR_MENU = $('#sidebar-menu'),
    $SIDEBAR_FOOTER = $('.sidebar-footer'),
    $LEFT_COL = $('.left_col'),
    $RIGHT_COL = $('.right_col'),
    $NAV_MENU = $('.nav_menu'),
    $FOOTER = $('footer');

// Sidebar
function init_sidebar() {
    $SIDEBAR_MENU = $('#sidebar-menu');
    // Dynamically render sidebar menu component to ensure single shared instance
    (function renderSidebar() {
      const sidebarContainer = document.getElementById("sidebar-menu");
      if (!sidebarContainer) return;
      
      sidebarContainer.innerHTML = `
        <div class="menu_section">
          <h3>General</h3>
          <ul class="nav side-menu">
            <li>
              <a href="index.html"><i class="fa fa-home"></i> Home</a>
            </li>
            <li id="controlPanelMenu">
              <a><i class="fa fa-edit"></i> Control-Panel <span class="fa fa-chevron-down"></span></a>
              <ul class="nav child_menu">
                <li><a href="activities.html">Activities</a></li>
                <li><a href="agents.html">Agents</a></li>
                <li><a href="booking.html">Bookings</a></li>
                <li><a href="city_info.html">City Information</a></li>
                <li><a href="excursion_description.html">Excursion Description</a></li>
                <li><a href="excursions.html">Excursions</a></li>
                <li><a href="hotels.html">Hotels</a></li>
                <li><a href="markup.html">Markups</a></li>
                <li><a href="othercharges.html">Other Charges</a></li>
                <li><a href="special_packages.html">Special Packages</a></li>
                <li><a href="stop_sale.html">Stop Sale</a></li>
                <li><a href="suppliers.html">Suppliers</a></li>
                <li><a href="tools.html">Tools</a></li>
                <li><a href="tour_description.html">Tour Description</a></li>
                <li><a href="tours.html">Tours</a></li>
                <li><a href="transfers.html">Transfers</a></li>
                <li><a href="users.html">Users</a></li>
              </ul>
            </li>
            <li>
              <a href="trip.html"><i class="fa fa-book"></i> Quotation</a>
            </li>
            <li>
              <a href="payment.html"><i class="fa fa-pencil-square-o"></i> Payment</a>
            </li>
            <li>
              <a href="invoice_management.html"><i class="fa fa-file-text-o"></i> Proforma Invoice</a>
            </li>
            <li>
              <a href="tax_invoices.html"><i class="fa fa-file-text-o"></i> Tax Invoices</a>
            </li>
            <li>
              <a href="itinerary.html"><i class="fa fa-ticket"></i> Itinerary</a>
            </li>
            <li>
              <a href="analytics.html"><i class="fa fa-bar-chart"></i> Analytics</a>
            </li>
            <li>
              <a href="special_promo.html"><i class="fa fa-bullhorn"></i> Special Promo</a>
            </li>
          </ul>
        </div>
      `;

      // Apply roles and permissions to dynamic menu elements
      const role = localStorage.getItem("role");
      let permissions = {};
      try {
        const stored = localStorage.getItem("permissions");
        if (stored && stored !== "undefined" && stored !== "null") {
          permissions = JSON.parse(stored) || {};
        }
      } catch (e) {
        console.error("Failed to parse permissions", e);
      }

      const mapping = {
        "tours.html": "tours",
        "hotels.html": "hotels",
        "transfers.html": "transfers",
        "excursions.html": "excursions",
        "booking.html": "bookings",
        "activities.html": "activities",
        "agents.html": "agents",
        "markup.html": "markups",
        "suppliers.html": "suppliers",
        "users.html": "users",
        "special_packages.html": "special_packages",
        "analytics.html": "analytics",
        "city_info.html": "city_info",
        "stop_sale.html": "stop_sale",
        "tools.html": "tools",
        "othercharges.html": "other_charges",
        "invoice_management.html": "proforma_invoices",
        "tax_invoices.html": "tax_invoices",
        "trip.html": "bookings",
        "payment.html": "bookings",
        "itinerary.html": "bookings"
      };

      const links = sidebarContainer.querySelectorAll("a");
      links.forEach(link => {
        const href = link.getAttribute("href");
        if (!href) return;
        const filename = href.substring(href.lastIndexOf("/") + 1);
        const permKey = mapping[filename];
        if (permKey && permissions && permissions[permKey] === false) {
          const li = link.closest("li");
          if (li) {
            li.style.display = "none";
          }
        }
      });

      const controlPanelMenu = document.getElementById("controlPanelMenu");
      if (controlPanelMenu) {
        if (role !== "admin" && role !== "superadmin") {
          const visibleLinks = controlPanelMenu.querySelectorAll("ul.child_menu li:not([style*='display: none'])");
          if (visibleLinks.length > 0) {
            controlPanelMenu.style.display = "block";
          } else {
            controlPanelMenu.style.display = "none";
          }
        } else {
          controlPanelMenu.style.display = "block";
        }
      }
    })();

    // TODO: This is some kind of easy fix, maybe we can improve this
    var setContentHeight = function () {
        // reset height
        $RIGHT_COL.css('min-height', $(window).height());

        var bodyHeight = $BODY.outerHeight(),
            footerHeight = $BODY.hasClass('footer_fixed') ? -10 : $FOOTER.height(),
            leftColHeight = $LEFT_COL.eq(1).height() + $SIDEBAR_FOOTER.height(),
            contentHeight = bodyHeight < leftColHeight ? leftColHeight : bodyHeight;

        // normalize content
        contentHeight -= $NAV_MENU.height() + footerHeight;

        $RIGHT_COL.css('min-height', contentHeight);
    };

    var openUpMenu = function () {
        $SIDEBAR_MENU.find('li').removeClass('active active-sm');
        $SIDEBAR_MENU.find('li ul').slideUp();
    }

    $SIDEBAR_MENU.on('click', 'a', function (ev) {
        var $li = $(this).parent();

        if ($li.is('.active')) {
            $li.removeClass('active active-sm');
            $('ul:first', $li).slideUp(function () {
                setContentHeight();
            });
        } else {
            // prevent closing menu if we are on child menu
            if (!$li.parent().is('.child_menu')) {
                openUpMenu();
            } else {
                if ($BODY.is('nav-sm')) {
                    if (!$li.parent().is('child_menu')) {
                        openUpMenu();
                    }
                }
            }

            $li.addClass('active');

            $('ul:first', $li).slideDown(function () {
                setContentHeight();
            });
        }
    });

    // toggle small or large menu
    $MENU_TOGGLE.on('click', function () {
        if ($BODY.hasClass('nav-md')) {
            $SIDEBAR_MENU.find('li.active ul').hide();
            $SIDEBAR_MENU.find('li.active').addClass('active-sm').removeClass('active');
        } else {
            $SIDEBAR_MENU.find('li.active-sm ul').show();
            $SIDEBAR_MENU.find('li.active-sm').addClass('active').removeClass('active-sm');
        }

        $BODY.toggleClass('nav-md nav-sm');

        setContentHeight();

        $('.dataTable').each(function () { $(this).dataTable().fnDraw(); });
    });

    // check active menu
    $SIDEBAR_MENU.find('a[href="' + CURRENT_URL + '"]').parent('li').addClass('current-page');

    $SIDEBAR_MENU.find('a').filter(function () {
        return this.href == CURRENT_URL;
    }).parent('li').addClass('current-page').parents('ul').slideDown(function () {
        setContentHeight();
    }).parent().addClass('active');

    // recompute content when resizing
    $(window).smartresize(function () {
        setContentHeight();
    });

    setContentHeight();

    // fixed sidebar
    if ($.fn.mCustomScrollbar) {
        $('.menu_fixed').mCustomScrollbar({
            autoHideScrollbar: true,
            theme: 'minimal',
            mouseWheel: { preventDefault: true }
        });
    }
}
// /Sidebar

// Panel toolbox
$(document).ready(function () {
    $('.collapse-link').on('click', function () {
        var $BOX_PANEL = $(this).closest('.x_panel'),
            $ICON = $(this).find('i'),
            $BOX_CONTENT = $BOX_PANEL.find('.x_content');

        // fix for some div with hardcoded fix class
        if ($BOX_PANEL.attr('style')) {
            $BOX_CONTENT.slideToggle(200, function () {
                $BOX_PANEL.removeAttr('style');
            });
        } else {
            $BOX_CONTENT.slideToggle(200);
            $BOX_PANEL.css('height', 'auto');
        }

        $ICON.toggleClass('fa-chevron-up fa-chevron-down');
    });

    $('.close-link').click(function () {
        var $BOX_PANEL = $(this).closest('.x_panel');

        $BOX_PANEL.remove();
    });
});
// /Panel toolbox

// Tooltip
$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip({
        container: 'body'
    });
});
// /Tooltip

// Progressbar
$(document).ready(function () {
    if ($(".progress .progress-bar")[0]) {
        $('.progress .progress-bar').progressbar();
    }
});
// /Progressbar

// Switchery
$(document).ready(function () {
    if ($(".js-switch")[0]) {
        var elems = Array.prototype.slice.call(document.querySelectorAll('.js-switch'));
        elems.forEach(function (html) {
            var switchery = new Switchery(html, {
                color: '#26B99A'
            });
        });
    }
});
// /Switchery

// iCheck
$(document).ready(function () {
    if ($("input.flat")[0]) {
        $(document).ready(function () {
            $('input.flat').iCheck({
                checkboxClass: 'icheckbox_flat-green',
                radioClass: 'iradio_flat-green'
            });
        });
    }
});
// /iCheck

// Table
$('table input').on('ifChecked', function () {
    checkState = '';
    $(this).parent().parent().parent().addClass('selected');
    countChecked();
});
$('table input').on('ifUnchecked', function () {
    checkState = '';
    $(this).parent().parent().parent().removeClass('selected');
    countChecked();
});

var checkState = '';

$('.bulk_action input').on('ifChecked', function () {
    checkState = '';
    $(this).parent().parent().parent().addClass('selected');
    countChecked();
});
$('.bulk_action input').on('ifUnchecked', function () {
    checkState = '';
    $(this).parent().parent().parent().removeClass('selected');
    countChecked();
});
$('.bulk_action input#check-all').on('ifChecked', function () {
    checkState = 'all';
    countChecked();
});
$('.bulk_action input#check-all').on('ifUnchecked', function () {
    checkState = 'none';
    countChecked();
});

function countChecked() {
    if (checkState === 'all') {
        $(".bulk_action input[name='table_records']").iCheck('check');
    }
    if (checkState === 'none') {
        $(".bulk_action input[name='table_records']").iCheck('uncheck');
    }

    var checkCount = $(".bulk_action input[name='table_records']:checked").length;

    if (checkCount) {
        $('.column-title').hide();
        $('.bulk-actions').show();
        $('.action-cnt').html(checkCount + ' Records Selected');
    } else {
        $('.column-title').show();
        $('.bulk-actions').hide();
    }
}

// Accordion
$(document).ready(function () {
    $(".expand").on("click", function () {
        $(this).next().slideToggle(200);
        $expand = $(this).find(">:first-child");

        if ($expand.text() == "+") {
            $expand.text("-");
        } else {
            $expand.text("+");
        }
    });
});

// NProgress
if (typeof NProgress != 'undefined') {
    $(document).ready(function () {
        NProgress.start();
    });

    $(window).on('load', function () {
        NProgress.done();
    });
}

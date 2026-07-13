(function () {
  function formatMoney(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return "Not available";
    return `THB ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} per night`;
  }

  function getMealsFromBlock(block) {
    const dropdown = block.querySelector(".roomtype-dropdown");
    if (!dropdown || dropdown.selectedIndex < 0) return {};
    const option = dropdown.options[dropdown.selectedIndex];
    try {
      return JSON.parse(option.getAttribute("data-meals") || "{}");
    } catch (error) {
      return {};
    }
  }

  function getTooltip(type, meals) {
    const map = {
      extra_adult_bed: ["Extra Adult Bed", meals.extra_bed_adult],
      extra_child_bed: ["Extra Child Bed", meals.extra_bed_child],
      sharing_bed: ["Sharing Bed", meals.extra_bed_shared],
    };
    const [label, price] = map[type] || ["Extra Bed", 0];
    return `${label}: ${formatMoney(price)}. Extra bed markup follows the selected agent markup group.`;
  }

  function ensureInfoIcon(label) {
    if (!label || label.querySelector(".extra-bed-info-icon")) return;
    const icon = document.createElement("i");
    icon.className = "fa fa-info-circle extra-bed-info-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.marginLeft = "4px";
    icon.style.color = "#1abb9c";
    icon.style.cursor = "help";
    label.appendChild(icon);
  }

  function applyTooltips(root) {
    const scope = root || document;
    scope.querySelectorAll(".room-type-block").forEach((block) => {
      const meals = getMealsFromBlock(block);
      ["extra_adult_bed", "extra_child_bed", "sharing_bed"].forEach((type) => {
        const checkbox = block.querySelector(`.option-checkbox[data-type='${type}']`);
        if (!checkbox) return;
        const label = block.querySelector(`label[for='${checkbox.id}']`);
        if (!label) return;
        const tooltip = getTooltip(type, meals);
        ensureInfoIcon(label);
        label.setAttribute("title", tooltip);
        label.setAttribute("data-toggle", "tooltip");
        label.setAttribute("data-placement", "top");
        checkbox.setAttribute("title", tooltip);
        checkbox.setAttribute("data-toggle", "tooltip");
      });
    });

    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.tooltip) {
      window.jQuery("[data-toggle='tooltip']").tooltip("dispose").tooltip({ container: "body" });
    }
  }

  document.addEventListener("change", function (event) {
    if (event.target && event.target.classList.contains("roomtype-dropdown")) {
      applyTooltips(event.target.closest(".room-type-block") || document);
    }
  });

  document.addEventListener("mouseenter", function (event) {
    const target = event.target;
    if (!target || !target.closest) return;
    const block = target.closest(".room-type-block");
    if (block && target.closest(".form-check")) {
      applyTooltips(block);
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    applyTooltips();
    const wrapper = document.getElementById("roomTypesWrapper");
    if (!wrapper || !window.MutationObserver) return;
    const observer = new MutationObserver(() => applyTooltips(wrapper));
    observer.observe(wrapper, { childList: true, subtree: true });
  });

  window.refreshExtraBedTooltips = applyTooltips;
})();

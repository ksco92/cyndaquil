"""Generate the HTML pages needed for the UI."""

import glob
import json

from utils.get_domain_name import get_domain_name

all_function_names = []

with open("../ui_templates/main_template.html") as f:
    main_template = f.read()

with open("../ui_templates/index_template.html") as f:
    index_template = f.read()

drop_down_template = """
<label for="{0}">{1}</label>
<select id="{0}">
{2}
</select>
"""

drop_down_options_template = """<option value="{0}">{0}</option>"""

bullet_list_template = """
<ul>
{0}
</ul>
"""

bullet_list_item_template = """\t<li><a href="/{0}.html">{0}</a></li>"""

form_template = """
<form id="textForm">
    {0}
    <button type="submit">Submit</button>
</form>
"""

text_area_template = """
\t<label for="{0}">{1}</label><br>
\t<textarea id="{0}" name="{0}"></textarea><br>
"""

for file in glob.glob("../lib/configs/lambdas/*.json"):
    html_fields = []

    with open(file) as f:
        function_metadata = json.load(f)

    function_name = file.split("/")[-1].split(".")[0]
    all_function_names.append(function_name)

    form_data = ','.join(
        [f"{i['name']}: document.getElementById('{i['name']}').value" for i in function_metadata["form_fields"]]
    )

    for field in function_metadata["form_fields"]:
        if field["type"] == "text_area":
            html_fields.append(text_area_template.format(field["name"], field["label"]))

        if field["type"] == "drop_down":
            html_fields.append(drop_down_template.format(
                field["name"],
                field["label"],
                "\n".join([drop_down_options_template.format(i) for i in field["drop_down_options"]])),
            )

        full_form = form_template.format("\n".join(html_fields))
        function_template = main_template.replace("FUNCTION_NAME", function_name)
        function_template = function_template.replace("FULL_FORM", full_form)
        function_template = function_template.replace("FORM_DATA", form_data)
        function_template = function_template.replace("DOMAIN_NAME", get_domain_name())

        with open(f"../ui_compiled/{function_name}.html", "w") as f:
            f.write(function_template)

    page_list = "\n".join([bullet_list_item_template.format(i) for i in all_function_names])
    new_index = bullet_list_template.format(page_list)
    new_index = index_template.replace("PAGE_LIST", new_index)

    with open("../ui_compiled/index.html", "w") as f:
        f.write(new_index)

# {"b":"1","a":"2"}

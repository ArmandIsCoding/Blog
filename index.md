---
layout: default
title: Home
---

### 🚀 Últimos posts

{% for post in site.posts %}
#### [{{ post.title }}]({{ post.url | relative_url }})
*{{ post.date | date: "%d/%m/%Y" }}* — {{ post.description }}
{% endfor %}

---

### 🚀 Proyectos en Desarrollo (Featured)

#### 🤖 [NoPilot](https://github.com/ArmandIsCoding/NoPilot/blob/main/README.md)
*Local AI Orchestration & Agentic Workflows.*  
Un experimento para ejecutar flujos de IA locales sin dependencia de la nube, optimizando la privacidad y latencia. Es parte de mi investigación sobre modelos locales y desarrollo asistido.

#### 💸 [Vaquita](https://github.com/ArmandIsCoding/vaquita)
*iOS Application.*  
Desarrollo nativo para iOS enfocado en la gestión colaborativa de gastos, aprovechando el ecosistema de Apple.

#### 📜 [PsNext](https://github.com/ArmandIsCoding/PsNext)
*Modern PSeInt Interpreter.*  
Re-versión de la herramienta PSeInt, integrando pseudocódigo con una vista gráfica lateral para mejorar la enseñanza de la lógica de programación de forma moderna.

---

### 📬 Let's talk
* **LinkedIn:** [in/armandomeabe](https://www.linkedin.com/in/armandomeabe/)
* **Gravatar:** [armandomeabe](https://gravatar.com/armandomeabe)

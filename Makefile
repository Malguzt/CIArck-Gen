.PHONY: run stop logs clean clean-all

# Comando principal para levantar todo lo necesario en Docker
run:
	docker compose up --build -d
	docker compose logs -f

# Detiene los contenedores
stop:
	docker compose down

# Muestra los logs de la aplicación
logs:
	docker compose logs -f

# Limpia los contenedores
clean: stop
	docker compose down -v

# Limpia completamente el entorno (contenedores y carpetas locales)
clean-all: clean
	rm -rf node_modules
	rm -rf .next package-lock.json

#!/usr/bin/python
# -*- coding: utf-8 -*-

import libkarel
import unittest

class TestLibKarel(unittest.TestCase):
    def test_basic(self):
        ki = libkarel.KarelInput('''
<ejecucion>
  <condiciones instruccionesMaximasAEjecutar="10000000" longitudStack="65000" />
  <mundos>
    <mundo nombre="mundo_0" ancho="100" alto="100">
    </mundo>
  </mundos>
  <programas tipoEjecucion="CONTINUA" intruccionesCambioContexto="1" milisegundosParaPasoAutomatico="0">
    <programa nombre="p1" ruta="{$2$}" mundoDeEjecucion="mundo_0" xKarel="1" yKarel="1" direccionKarel="NORTE" mochilaKarel="0" >
      <despliega tipo="MUNDO" />
    </programa>
  </programas>
</ejecucion>
        ''')
	# Dimensiones del mundo
	self.assertEqual(ki.w, 100)
	self.assertEqual(ki.h, 100)

	# Estado inicial de Karel
	self.assertEqual(ki.x, 1)
	self.assertEqual(ki.y, 1)
	self.assertEqual(ki.mochila, 0)
	self.assertEqual(ki.direccion, 'NORTE')

	# Despliegas
	self.assertEqual(ki.despliega, ['MUNDO'])
	self.assertEqual(ki.despliega_orientacion, False)
	self.assertEqual(ki.despliega_mundo, True)
	self.assertEqual(ki.despliega_posicion, False)
	self.assertEqual(ki.despliega_instrucciones, False)

	# Estado interno
	self.assertEqual(ki._lista_zumbadores, [])
	self.assertEqual(ki._zumbadores, {})
	self.assertEqual(ki._lista_dump, [])
	self.assertEqual(ki._dump, {})

	# API público
	self.assertEqual(ki.zumbadores(1, 1), 0)
	self.assertEqual(ki.dump(1, 1), False)

class TestLibKarelOutput(unittest.TestCase):
    def test_basic(self):
        ko = libkarel.KarelOutput('''
<resultados>
	<mundos>
		<mundo nombre="mundo_0"/>
	</mundos>
	<programas>
		<programa nombre="p1" resultadoEjecucion="FIN PROGRAMA"/>
	</programas>
</resultados>
        ''')

	# Estado de la ejecución
	self.assertEqual(ko.resultado, 'FIN PROGRAMA')
	self.assertEqual(ko.error, False)

	# Despliegas
	self.assertEqual(ko.x, None)
	self.assertEqual(ko.y, None)
	self.assertEqual(ko.direccion, None)

	# API público
	self.assertEqual(ko.zumbadores(1, 1), 0)

if __name__ == '__main__':
    unittest.main()
